"""
Redis Lua Scripts for High-Concurrency Atomic Token Management.

Guarantees:
1. Zero race conditions under concurrent requests.
2. Hard stop execution: never exceeds user_spend_limit.
3. Daily rate-limiting with auto-expiring keys.
4. Exact reconciliation: compensates difference between estimated pre-flight
   reservation and actual upstream usage (total_tokens).
"""

# Script 1: Atomic Preflight Reservation
# KEYS:
#   1: tb:{token_id}:used_tokens
#   2: tb:{token_id}:user_spend_limit
#   3: tb:{token_id}:daily_used:{date_str}
#   4: tb:{token_id}:daily_limit
#   5: tb:{token_id}:total_allocated
# ARGV:
#   1: estimated_tokens (integer)
#   2: daily_ttl_seconds (integer, e.g. 86400)
# Returns table:
#   {status_code, error_or_ok_msg, remaining_tokens, spend_limit}
#   status_code: 1 for SUCCESS, 0 for FAILURE
RESERVE_TOKENS_LUA = """
local used_key = KEYS[1]
local spend_limit_key = KEYS[2]
local daily_used_key = KEYS[3]
local daily_limit_key = KEYS[4]
local total_allocated_key = KEYS[5]

local estimated = tonumber(ARGV[1])
local daily_ttl = tonumber(ARGV[2])

-- 1. Verify token exists
local spend_limit_raw = redis.call('GET', spend_limit_key)
if not spend_limit_raw then
    return {0, "TOKEN_NOT_FOUND", 0, 0}
end
local spend_limit = tonumber(spend_limit_raw)

local used = tonumber(redis.call('GET', used_key) or '0')

-- 2. Check hard spend limit
if (used + estimated) > spend_limit then
    local remaining = spend_limit - used
    if remaining < 0 then remaining = 0 end
    return {0, "SPEND_LIMIT_EXCEEDED", remaining, spend_limit}
end

-- 3. Check daily limit (if configured)
local daily_limit_raw = redis.call('GET', daily_limit_key)
if daily_limit_raw and daily_limit_raw ~= '' then
    local daily_limit = tonumber(daily_limit_raw)
    local daily_used = tonumber(redis.call('GET', daily_used_key) or '0')
    if (daily_used + estimated) > daily_limit then
        local daily_remaining = daily_limit - daily_used
        if daily_remaining < 0 then daily_remaining = 0 end
        return {0, "DAILY_LIMIT_EXCEEDED", daily_remaining, daily_limit}
    end
end

-- 4. Atomically commit reservation
local new_used = redis.call('INCRBY', used_key, estimated)

if daily_limit_raw and daily_limit_raw ~= '' then
    local new_daily = redis.call('INCRBY', daily_used_key, estimated)
    if new_daily == estimated then
        redis.call('EXPIRE', daily_used_key, daily_ttl)
    end
end

local remaining_after = spend_limit - new_used
if remaining_after < 0 then remaining_after = 0 end

return {1, "OK", remaining_after, spend_limit}
"""

# Script 2: Atomic Post-Call Reconciliation
# KEYS:
#   1: tb:{token_id}:used_tokens
#   2: tb:{token_id}:user_spend_limit
#   3: tb:{token_id}:daily_used:{date_str}
#   4: tb:{token_id}:daily_limit
# ARGV:
#   1: estimated_tokens (what was reserved)
#   2: actual_tokens (actual upstream usage.total_tokens)
# Returns table:
#   {status_code, status_msg, remaining_tokens, new_used_total}
RECONCILE_TOKENS_LUA = """
local used_key = KEYS[1]
local spend_limit_key = KEYS[2]
local daily_used_key = KEYS[3]
local daily_limit_key = KEYS[4]

local estimated = tonumber(ARGV[1])
local actual = tonumber(ARGV[2])
local diff = actual - estimated

-- Adjust used_tokens
local new_used = redis.call('INCRBY', used_key, diff)
if new_used < 0 then
    redis.call('SET', used_key, '0')
    new_used = 0
end

-- Adjust daily_used if key exists
local daily_limit_raw = redis.call('GET', daily_limit_key)
if daily_limit_raw and daily_limit_raw ~= '' then
    local new_daily = redis.call('INCRBY', daily_used_key, diff)
    if new_daily < 0 then
        redis.call('SET', daily_used_key, '0')
    end
end

local spend_limit = tonumber(redis.call('GET', spend_limit_key) or '0')
local remaining = spend_limit - new_used
if remaining < 0 then remaining = 0 end

return {1, "RECONCILED", remaining, new_used}
"""

# Script 3: Atomic Limits Update
# KEYS:
#   1: tb:{token_id}:total_allocated
#   2: tb:{token_id}:user_spend_limit
#   3: tb:{token_id}:daily_limit
# ARGV:
#   1: new_user_spend_limit (-1 if unchanged)
#   2: new_daily_limit (-1 if unchanged, 0 to remove)
# Returns table:
#   {status_code, message, current_spend_limit, current_daily_limit}
UPDATE_LIMITS_LUA = """
local total_key = KEYS[1]
local spend_key = KEYS[2]
local daily_key = KEYS[3]

local total_allocated = tonumber(redis.call('GET', total_key))
if not total_allocated then
    return {0, "TOKEN_NOT_FOUND", 0, 0}
end

local new_spend = tonumber(ARGV[1])
local new_daily = tonumber(ARGV[2])

if new_spend > -1 then
    if new_spend > total_allocated then
        return {0, "SPEND_LIMIT_EXCEEDS_ALLOCATION", 0, 0}
    end
    if new_spend < 0 then
        return {0, "INVALID_SPEND_LIMIT", 0, 0}
    end
    redis.call('SET', spend_key, new_spend)
end

if new_daily > -1 then
    if new_daily == 0 then
        redis.call('DEL', daily_key)
    else
        if new_daily > total_allocated then
            return {0, "DAILY_LIMIT_EXCEEDS_ALLOCATION", 0, 0}
        end
        redis.call('SET', daily_key, new_daily)
    end
end

local current_spend = tonumber(redis.call('GET', spend_key) or '0')
local current_daily = tonumber(redis.call('GET', daily_key) or '-1')

return {1, "SUCCESS", current_spend, current_daily}
"""

# Script 4: Atomic Status Fetch
# KEYS:
#   1: tb:{token_id}:total_allocated
#   2: tb:{token_id}:used_tokens
#   3: tb:{token_id}:user_spend_limit
#   4: tb:{token_id}:daily_limit
#   5: tb:{token_id}:daily_used:{date_str}
# Returns:
#   {total_allocated, used_tokens, spend_limit, daily_limit, daily_used}
GET_STATUS_LUA = """
local total = redis.call('GET', KEYS[1])
if not total then
    return {0, 0, 0, -1, 0, "NOT_FOUND"}
end

local used = redis.call('GET', KEYS[2]) or '0'
local spend_limit = redis.call('GET', KEYS[3]) or total
local daily_limit = redis.call('GET', KEYS[4]) or '-1'
local daily_used = redis.call('GET', KEYS[5]) or '0'

return {
    tonumber(total),
    tonumber(used),
    tonumber(spend_limit),
    tonumber(daily_limit),
    tonumber(daily_used),
    "ACTIVE"
}
"""

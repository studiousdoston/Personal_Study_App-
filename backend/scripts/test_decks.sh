#!/usr/bin/env bash
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"
PASSWORD="password123"
PASSED=0
FAILED=0
STATUS=""
BODY=""

##########################################################
#                       HELPERS
##########################################################
request() {
    local method=$1 path=$2 token=$3 data=${4:-}
    local args=(-s -X "$method" "$BASE_URL$path" -w $'\n%{http_code}')
    [[ -n "$token" ]] && args+=(-H "Authorization: Bearer $token")
    [[ -n "$data" ]] && args+=(-H "Content-Type: application/json" -d "$data")
    local output
    output=$(curl "${args[@]}")
    STATUS=${output##*$'\n'}
    BODY=${output%$'\n'*}
}

json_get() {
    python3 -c 'import sys, json
data = json.loads(sys.argv[1])
for key in sys.argv[2:]:
    data = data[int(key)] if isinstance(data, list) else data[key]
print("null" if data is None else data)' "$BODY" "$@" 2>/dev/null
}

check_status() {
    local name=$1 expected=$2
    if [[ "$STATUS" == "$expected" ]]; then
        echo "PASS  $name (expected $expected, got $STATUS)"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected $expected, got $STATUS)"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_status_in() {
    local name=$1 expected1=$2 expected2=$3
    if [[ "$STATUS" == "$expected1" || "$STATUS" == "$expected2" ]]; then
        echo "PASS  $name (expected $expected1 or $expected2, got $STATUS)"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected $expected1 or $expected2, got $STATUS)"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_value() {
    local name=$1 expected=$2 actual=$3
    if [[ "$actual" == "$expected" ]]; then
        echo "PASS  $name (expected '$expected', got '$actual')"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name (expected '$expected', got '$actual')"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

check_true() {
    local name=$1 condition=$2
    if [[ "$condition" == "yes" ]]; then
        echo "PASS  $name"
        PASSED=$((PASSED + 1))
    else
        echo "FAIL  $name"
        echo "      body: $BODY"
        FAILED=$((FAILED + 1))
    fi
}

list_contains_deck() {
    python3 -c 'import sys, json
print("yes" if any(d["id"] == sys.argv[2] for d in json.loads(sys.argv[1])) else "no")' "$BODY" "$1" 2>/dev/null
}

##########################################################
#                       SETUP
##########################################################
echo "== Setup"
request POST /auth/register "" '{"email": "alice@example.com", "password": "'$PASSWORD'"}'
check_status_in "register alice" 201 409

request POST /auth/login "" '{"email": "alice@example.com", "password": "'$PASSWORD'"}'
check_status "login alice" 200
TOKEN=$(json_get access_token)

request POST /auth/register "" '{"email": "bob@example.com", "password": "'$PASSWORD'"}'
check_status_in "register bob" 201 409

request POST /auth/login "" '{"email": "bob@example.com", "password": "'$PASSWORD'"}'
check_status "login bob" 200
TOKEN2=$(json_get access_token)

##########################################################
#                       CREATE
##########################################################
echo "== Create"
request POST /decks "$TOKEN" '{"name": "  Spanish verbs  ", "description": "Irregular ones"}'
check_status "create deck" 201
DECK_ID=$(json_get id)
check_value "name is stripped on create" "Spanish verbs" "$(json_get name)"
check_true "user_id is not returned" "$(python3 -c 'import sys, json; print("no" if "user_id" in json.loads(sys.argv[1]) else "yes")' "$BODY" 2>/dev/null)"

request POST /decks "$TOKEN" '{"name": "   "}'
check_status "create with empty name" 422

##########################################################
#                     LIST AND GET
##########################################################
echo "== List and get"
request GET /decks "$TOKEN"
check_status "list decks" 200
check_true "new deck is in the list" "$(list_contains_deck "$DECK_ID")"

request GET "/decks/$DECK_ID" "$TOKEN"
check_status "get deck" 200

##########################################################
#                       UPDATE
##########################################################
echo "== Update"
request PATCH "/decks/$DECK_ID" "$TOKEN" '{"name": "Spanish irregular verbs"}'
check_status "patch name only" 200
check_value "name changed" "Spanish irregular verbs" "$(json_get name)"
check_value "description unchanged after name-only patch" "Irregular ones" "$(json_get description)"

request PATCH "/decks/$DECK_ID" "$TOKEN" '{"description": null}'
check_status "patch description null" 200
check_value "description is null after clearing" "null" "$(json_get description)"
check_value "name unchanged after clearing description" "Spanish irregular verbs" "$(json_get name)"

request PATCH "/decks/$DECK_ID" "$TOKEN" '{"name": null}'
check_status "patch name null" 422

##########################################################
#                 BAD IDS AND NO TOKEN
##########################################################
echo "== Bad ids and no token"
request GET /decks/00000000-0000-4000-8000-000000000000 "$TOKEN"
check_status "get random uuid" 404

request GET /decks/abc "$TOKEN"
check_status "get invalid id" 422

request GET /decks ""
check_status "list without token" 401

##########################################################
#                      OWNERSHIP
##########################################################
echo "== Ownership"
request GET "/decks/$DECK_ID" "$TOKEN2"
check_status "bob gets alice's deck" 404

request PATCH "/decks/$DECK_ID" "$TOKEN2" '{"name": "Hacked"}'
check_status "bob patches alice's deck" 404

request DELETE "/decks/$DECK_ID" "$TOKEN2"
check_status "bob deletes alice's deck" 404

request GET "/decks/$DECK_ID" "$TOKEN"
check_status "alice still gets her deck" 200
check_true "name is not 'Hacked' after bob's patch" "$([[ "$(json_get name)" != "Hacked" ]] && echo yes || echo no)"

##########################################################
#                       DELETE
##########################################################
echo "== Delete"
request DELETE "/decks/$DECK_ID" "$TOKEN"
check_status "delete deck" 204
check_value "delete returns empty body" "" "$BODY"

request GET "/decks/$DECK_ID" "$TOKEN"
check_status "get deleted deck" 404

request DELETE "/decks/$DECK_ID" "$TOKEN"
check_status "delete already-deleted deck" 404

request GET /decks "$TOKEN"
check_status "list after delete" 200
check_true "deleted deck is missing from the list" "$([[ "$(list_contains_deck "$DECK_ID")" == "no" ]] && echo yes || echo no)"

##########################################################
#                       SUMMARY
##########################################################
echo
echo "$PASSED passed, $FAILED failed"
[[ $FAILED -eq 0 ]]

#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Aplikasi Kebun LSU (rebranded DATA EPCS TAGGING). Perubahan: (1) Nama dashboard/login diganti jadi DATA EPCS TAGGING. (2) Id Actual bukan auto-increment lagi, melainkan gabungan Kebun+Blok+CodeLSU+Koord_X+Koord_Y (tanpa afdeling, tanpa pemisah). Koordinat pakai koma sebagai desimal. Contoh: Kebun=KSL, Blok=OA11, CodeLSU=TS01, X=110,400113, Y=0,654521 => KSLOA11TS01110,4001130,654521"

backend:
  - task: "Id Actual sebagai gabungan data (bukan auto-increment)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Removed counter-based auto-increment. Added build_id_actual() = kebun+blok+code_lsu+fmt_num(koord_x)+fmt_num(koord_y). fmt_num uses comma decimal. Computed in serialize() and _fetch_docs() for PDF. Verified locally matches example KSLOA11TS01110,4001130,654521. Need to test: POST /api/records returns correct id_actual, PUT updates recompute, GET /api/records list, import confirm, PDF exports (labels+table) embed id_actual."
        - working: true
          agent: "testing"
          comment: "✅ ALL TESTS PASSED. Comprehensive backend testing completed: (1) POST /api/records created record with correct id_actual='KSLOA11TS01110,4001130,654521' (string type, concatenation format verified). (2) GET /api/records confirmed record appears with correct id_actual as string. (3) PUT /api/records/{id} with koord_x=111.5, koord_y=2 correctly recomputed id_actual='KSLOA11TS01111,52' - integer coordinate renders without decimals, decimal uses comma separator. (4) GET/POST /api/records/export/labels returned 200 with application/pdf (31MB and 11KB respectively). (5) GET/POST /api/records/export/table returned 200 with application/pdf. (6) GET /api/records/stats returned 200 with correct stats. No 500 errors, no id_actual mismatches. Id Actual generation working perfectly as designed."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Login: admin@kebun.id / admin123. Tolong test endpoint records: create record dengan kebun=KSL, blok=OA11, code_lsu=TS01, koord_x=110.400113, koord_y=0.654521 -> id_actual harus 'KSLOA11TS01110,4001130,654521'. Test PUT update mengubah koord dan id_actual ikut berubah. Test GET /api/records mengembalikan id_actual string. Test import confirm dan export PDF labels/table (200 OK)."
    - agent: "testing"
      message: "Backend testing complete - ALL TESTS PASSED (9/9). Id Actual generation working perfectly: concatenation format correct, comma decimal separator working, integer coordinates render without decimals, string type confirmed, all CRUD operations successful, PDF exports working (labels & table), stats endpoint working. No errors or issues found. Ready for production."

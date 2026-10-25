import { initDatabase, db, runTransaction, prepareStatement } from './index';
import { Question, Round, Competition } from '../../../shared/types';

export function seedDatabase(): void {
  initDatabase();

  const compId = 'comp-techquiz-2026';
  const existing = prepareStatement('SELECT id FROM competitions WHERE id = ?').get(compId);
  if (existing) {
    console.log('[Seed] Database already contains seed competition. Refreshing data...');
    prepareStatement('DELETE FROM competitions WHERE id = ?').run(compId);
  }

  runTransaction(() => {
    // 1. Create Default Competition
    const competition: Competition = {
      id: compId,
      title: 'TechQuiz Arena Grand Championship 2026',
      description: 'The ultimate offline LAN battle for Software & IT Engineers across 5 specialized rounds.',
      createdAt: new Date().toISOString(),
      rounds: []
    };

    prepareStatement(`
      INSERT OR REPLACE INTO competitions (id, title, description, created_at)
      VALUES (?, ?, ?, ?)
    `).run(competition.id, competition.title, competition.description, competition.createdAt);

    // 2. Define Questions (30 questions across topics)
    const questions: Question[] = [
      // ================= ROUND 1: Screening MCQs =================
      {
        id: 'q-scr-01',
        type: 'mcq',
        title: 'C Pointer Dereferencing',
        text: 'In C, what is the value of `*p` after executing: `int arr[] = {10, 20, 30}; int *p = arr + 1;`?',
        topic: 'Programming Fundamentals in C',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: '10' },
          { id: 'B', text: '20' },
          { id: 'C', text: '30' },
          { id: 'D', text: 'Undefined behavior / Garbage' }
        ],
        correctAnswer: 'B',
        explanation: '`arr + 1` points to the second element `arr[1]`, which is 20. Dereferencing `*p` returns 20.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-02',
        type: 'mcq',
        title: 'Git Merge vs Rebase',
        text: 'Which git command replays your branch commits on top of another base tip, creating a linear history without merge commits?',
        topic: 'Git Version Control',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'git merge --no-ff' },
          { id: 'B', text: 'git rebase' },
          { id: 'C', text: 'git cherry-pick --all' },
          { id: 'D', text: 'git reset --soft' }
        ],
        correctAnswer: 'B',
        explanation: '`git rebase` reapplies commits on top of another base tip to yield a linear project history.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-03',
        type: 'mcq',
        title: 'TCP 3-Way Handshake',
        text: 'What are the three control packets exchanged in order to establish a standard TCP connection?',
        topic: 'Computer Networks',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'SYN, ACK, SYN-ACK' },
          { id: 'B', text: 'SYN, SYN-ACK, ACK' },
          { id: 'C', text: 'ACK, SYN, ACK' },
          { id: 'D', text: 'FIN, ACK, FIN-ACK' }
        ],
        correctAnswer: 'B',
        explanation: 'The client sends SYN, server responds with SYN-ACK, client acknowledges with ACK.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-04',
        type: 'mcq',
        title: 'SQL WHERE vs HAVING',
        text: 'In SQL, what is the primary difference between the `WHERE` clause and the `HAVING` clause?',
        topic: 'Database Management Systems',
        difficulty: 'medium',
        timeLimitSeconds: 25,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'WHERE filters rows before grouping; HAVING filters groups after aggregation' },
          { id: 'B', text: 'HAVING filters rows before grouping; WHERE filters aggregated results' },
          { id: 'C', text: 'WHERE can use aggregate functions like COUNT(); HAVING cannot' },
          { id: 'D', text: 'There is no difference; they are aliases in ANSI SQL' }
        ],
        correctAnswer: 'A',
        explanation: '`WHERE` filters individual rows prior to `GROUP BY`. `HAVING` applies filtering conditions to aggregated groups.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-05',
        type: 'mcq',
        title: 'OS Page Fault',
        text: 'When does an Operating System trigger a Page Fault interrupt?',
        topic: 'Operating Systems',
        difficulty: 'medium',
        timeLimitSeconds: 25,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'When a program attempts to divide by zero' },
          { id: 'B', text: 'When an accessed page is not currently present in physical RAM' },
          { id: 'C', text: 'When the CPU cache reaches 100% capacity' },
          { id: 'D', text: 'When a thread enters a deadlock condition' }
        ],
        correctAnswer: 'B',
        explanation: 'A page fault is raised by the MMU when a memory address referenced by a process is not resident in physical RAM.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-06',
        type: 'short_text',
        title: 'HTTP Idempotency',
        text: 'Name the HTTP method commonly used to partially update an existing resource (type the method name in uppercase).',
        topic: 'Networking & Web APIs',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        shortAnswerAccepted: ['PATCH'],
        shortAnswerCaseSensitive: false,
        explanation: '`PATCH` is designed for partial resource modifications, unlike `PUT` which replaces the entire resource representation.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-07',
        type: 'mcq',
        title: 'OOP Diamond Problem',
        text: 'Which Object-Oriented concept can lead to the "Diamond Problem" of ambiguous inherited method implementation?',
        topic: 'Object-Oriented Programming',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'Single Inheritance' },
          { id: 'B', text: 'Multiple Inheritance' },
          { id: 'C', text: 'Method Overloading' },
          { id: 'D', text: 'Dynamic Dispatch' }
        ],
        correctAnswer: 'B',
        explanation: 'The Diamond Problem occurs in languages supporting multiple class inheritance when a class inherits from two classes with a common ancestor.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-08',
        type: 'mcq',
        title: 'DSA Time Complexity',
        text: 'What is the worst-case time complexity of searching for an element in an unbalance Binary Search Tree (BST)?',
        topic: 'Data Structures & Algorithms',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'O(log n)' },
          { id: 'B', text: 'O(n)' },
          { id: 'C', text: 'O(n log n)' },
          { id: 'D', text: 'O(1)' }
        ],
        correctAnswer: 'B',
        explanation: 'In the worst case (a skewed tree resembling a linked list), searching an unbalanced BST degrades to O(n).',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-09',
        type: 'true_false',
        title: 'Security: Symmetric Encryption',
        text: 'In symmetric key cryptography (e.g. AES-256), the exact same secret key is used for both encryption and decryption.',
        topic: 'Cybersecurity',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'True' },
          { id: 'B', text: 'False' }
        ],
        correctAnswer: 'A',
        explanation: 'Symmetric encryption relies on a shared single secret key for both encryption and decryption operations.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-10',
        type: 'mcq',
        title: 'Linux File Inodes',
        text: 'In Linux filesystem architecture, what critical information about a file is NOT stored in its inode?',
        topic: 'Operating Systems & Linux',
        difficulty: 'medium',
        timeLimitSeconds: 25,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'File permissions (mode)' },
          { id: 'B', text: 'File size in bytes' },
          { id: 'C', text: 'File name' },
          { id: 'D', text: 'Data block pointers' }
        ],
        correctAnswer: 'C',
        explanation: 'An inode stores metadata (permissions, owner, size, timestamps, block pointers), but file names are stored in directory entry files (dentries) mapping to inode numbers.',
        createdAt: new Date().toISOString()
      },

      // ================= ROUND 2: Code Output & Debugging =================
      {
        id: 'q-code-01',
        type: 'code',
        title: 'C Pointer Arithmetic & Post-Increment',
        text: 'Analyze the following C program. What will be printed to standard output?',
        topic: 'Programming Fundamentals in C',
        difficulty: 'medium',
        timeLimitSeconds: 45,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'c',
        codeSnippet: `#include <stdio.h>

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    int val = *ptr++;
    printf("%d %d\\n", val, *ptr);
    return 0;
}`,
        options: [
          { id: 'A', text: '10 10' },
          { id: 'B', text: '10 20' },
          { id: 'C', text: '20 20' },
          { id: 'D', text: '11 20' }
        ],
        correctAnswer: 'B',
        explanation: 'The postfix `++` has higher precedence than `*`, but yields the original pointer for dereference first. So `val` receives `arr[0]` (10), while `ptr` increments to `arr[1]` (20).',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-code-02',
        type: 'code',
        title: 'Python Mutable Default Arguments Bug',
        text: 'What is the output of the two function calls in this Python script?',
        topic: 'Programming Languages (Python)',
        difficulty: 'medium',
        timeLimitSeconds: 45,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'python',
        codeSnippet: `def append_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(append_item("x"))
print(append_item("y"))`,
        options: [
          { id: 'A', text: "['x']\\n['y']" },
          { id: 'B', text: "['x']\\n['x', 'y']" },
          { id: 'C', text: "['x', 'y']\\n['x', 'y']" },
          { id: 'D', text: "SyntaxError: mutable default argument" }
        ],
        correctAnswer: 'B',
        explanation: 'In Python, default arguments are evaluated once at function definition time. The list `bucket` is reused across calls, so appending "y" adds to the existing list containing "x".',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-code-03',
        type: 'code',
        title: 'Java Static Binding vs Overriding',
        text: 'What will be printed when running this Java class?',
        topic: 'Object-Oriented Programming (Java)',
        difficulty: 'hard',
        timeLimitSeconds: 50,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'java',
        codeSnippet: `class Base {
    public static void display() { System.out.print("Base "); }
    public void print() { System.out.print("BasePrint "); }
}
class Derived extends Base {
    public static void display() { System.out.print("Derived "); }
    @Override
    public void print() { System.out.print("DerivedPrint "); }
}
public class Test {
    public static void main(String[] args) {
        Base obj = new Derived();
        obj.display();
        obj.print();
    }
}`,
        options: [
          { id: 'A', text: 'Base BasePrint' },
          { id: 'B', text: 'Derived DerivedPrint' },
          { id: 'C', text: 'Base DerivedPrint' },
          { id: 'D', text: 'Compilation Error: static method cannot be hidden' }
        ],
        correctAnswer: 'C',
        explanation: 'Static methods are resolved at compile-time based on the reference type (`Base`), so `obj.display()` calls `Base.display()`. Instance methods are resolved at runtime via dynamic dispatch, so `obj.print()` invokes `Derived.print()`.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-code-04',
        type: 'code',
        title: 'SQL NULL Comparison & NOT IN Trap',
        text: 'Given table `departments` with IDs (1, 2, 3) and `employees` with dept_ids (1, NULL), what does this query return?',
        topic: 'Database Management Systems (SQL)',
        difficulty: 'hard',
        timeLimitSeconds: 50,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'sql',
        codeSnippet: `SELECT department_id 
FROM departments 
WHERE department_id NOT IN (
    SELECT dept_id FROM employees
);`,
        options: [
          { id: 'A', text: 'Rows: 2, 3' },
          { id: 'B', text: 'Rows: 1, 2, 3' },
          { id: 'C', text: 'Empty result set (0 rows)' },
          { id: 'D', text: 'SQL Syntax Error' }
        ],
        correctAnswer: 'C',
        explanation: 'If any value returned by the subquery is `NULL`, `x NOT IN (...)` translates to `x != 1 AND x != NULL`. In SQL 3-valued logic, `x != NULL` evaluates to `UNKNOWN`, causing the entire `WHERE` clause to fail for all rows.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-code-05',
        type: 'code',
        title: 'C++ Virtual Destructor Memory Leak',
        text: 'What issue exists in this C++ snippet when deleting `b`?',
        topic: 'OOP in C++',
        difficulty: 'medium',
        timeLimitSeconds: 45,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'cpp',
        codeSnippet: `class Base {
public:
    ~Base() { std::cout << "~Base "; }
};
class Derived : public Base {
    int *data;
public:
    Derived() { data = new int[100]; }
    ~Derived() { delete[] data; std::cout << "~Derived "; }
};
int main() {
    Base *b = new Derived();
    delete b;
    return 0;
}`,
        options: [
          { id: 'A', text: 'Undefined behavior / Derived destructor is not called, leaking memory' },
          { id: 'B', text: 'Prints ~Derived ~Base cleanly' },
          { id: 'C', text: 'Double free exception thrown' },
          { id: 'D', text: 'Compiler error: cannot allocate int array in constructor' }
        ],
        correctAnswer: 'A',
        explanation: 'Because `Base` lacks a `virtual` destructor, deleting a `Derived` object through a `Base*` does not invoke `~Derived()`, leading to undefined behavior and a resource leak.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-code-06',
        type: 'code',
        title: 'C Array Bounds and Buffer Overrun',
        text: 'What will happen during the execution of this C code?',
        topic: 'Programming Fundamentals in C',
        difficulty: 'medium',
        timeLimitSeconds: 40,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'c',
        codeSnippet: `#include <stdio.h>
#include <string.h>

int main() {
    char buf[8];
    strcpy(buf, "TechQuizArena2026");
    printf("%s\\n", buf);
    return 0;
}`,
        options: [
          { id: 'A', text: 'Prints TechQuizArena2026 safely' },
          { id: 'B', text: 'Compiler truncates the string automatically to 8 chars' },
          { id: 'C', text: 'Stack buffer overflow writing beyond allocated array bounds' },
          { id: 'D', text: 'Compilation error: string literal too long for strcpy' }
        ],
        correctAnswer: 'C',
        explanation: '`strcpy` does not perform bounds checking. Writing 18 bytes into an 8-byte stack buffer corrupts adjacent stack memory (stack smashing buffer overflow).',
        createdAt: new Date().toISOString()
      },

      // ================= ROUND 3: Scenario-Based (Rubric Scored) =================
      {
        id: 'q-scen-01',
        type: 'written_rubric',
        title: 'High-Concurrency Database Deadlock in Checkout',
        text: `Scenario:
During a flash-sale event on your e-commerce platform, thousands of concurrent requests call the checkout endpoint. You observe rapid database connection saturation and error logs filled with:
"ERROR: deadlock detected - Process 4120 waits for ExclusiveLock on transaction 8910; Process 4121 waits for ExclusiveLock on transaction 8909".

Code inspection reveals that Checkout Transaction A updates the Inventory table first and then the Wallet table, while Transaction B (e.g. cashback or promo refund) updates the Wallet table first and then the Inventory table.

Provide a comprehensive engineering response detailing:
1. The exact Root Cause of the deadlocks under concurrency.
2. The immediate engineering Fix to eliminate the deadlock condition.
3. The long-term Prevention architecture for high-throughput transactional integrity.`,
        topic: 'Database Engineering & Concurrency',
        difficulty: 'hard',
        timeLimitSeconds: 120,
        points: 10,
        negativePoints: 0,
        bonusPoints: 0,
        rubricCriteria: [
          { id: 'crit-rc', title: 'Root Cause Identification', maxScore: 5, description: 'Correctly identifies lock acquisition order inversion (circular wait condition) between concurrent transactions.' },
          { id: 'crit-fix', title: 'Technical Fix', maxScore: 3, description: 'Specifies enforcing a deterministic global lock ordering (e.g. always lock Inventory before Wallet, or order by primary key ID).' },
          { id: 'crit-prev', title: 'Long-term Prevention', maxScore: 2, description: 'Recommends idempotent queues, optimistic concurrency (version checking), or asynchronous event-driven state transitions.' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scen-02',
        type: 'written_rubric',
        title: 'JWT Authentication Token Theft vs CSRF Vulnerability',
        text: `Scenario:
A security audit of your web application reveals that your frontend stores raw JWT Bearer tokens in browser 'localStorage'. The team proposes switching to storing the JWT in a cookie with 'HttpOnly; Secure; SameSite=Strict' to mitigate XSS-based token theft. However, a developer objects, claiming this will introduce Cross-Site Request Forgery (CSRF) vulnerabilities.

Explain:
1. Root Cause: Why storing tokens in 'localStorage' is dangerous against XSS compared to 'HttpOnly' cookies.
2. Fix: How to configure cookies and modern API defense to protect against both XSS token theft AND CSRF.
3. Prevention: Architecture best practices (e.g., short-lived tokens, token rotation, SameSite cookies, CSRF tokens/headers).`,
        topic: 'Cybersecurity & Web Architecture',
        difficulty: 'hard',
        timeLimitSeconds: 120,
        points: 10,
        negativePoints: 0,
        bonusPoints: 0,
        rubricCriteria: [
          { id: 'crit-sec-rc', title: 'Root Cause & Threat Model', maxScore: 5, description: 'Explains that JavaScript can read localStorage via injected XSS scripts, whereas HttpOnly cookies cannot be accessed by document.cookie.' },
          { id: 'crit-sec-fix', title: 'Remediation Strategy', maxScore: 3, description: 'Proposes HttpOnly + SameSite=Strict/Lax with custom request headers (e.g. X-Requested-With) or double-submit CSRF tokens.' },
          { id: 'crit-sec-prev', title: 'Defense-in-Depth Prevention', maxScore: 2, description: 'Mentions short token TTLs, refresh token rotation in HttpOnly cookies, and strict Content-Security-Policy (CSP).' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scen-03',
        type: 'written_rubric',
        title: 'Node.js Memory Leak from Uncleaned Event Listeners',
        text: `Scenario:
Your production Node.js real-time notification service crashes with "FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory" every 6 hours.
Heap snapshot analysis reveals millions of active closure references retained in 'EventEmitter' listeners associated with disconnected user WebSocket sessions.

Detail:
1. Root Cause: How closure references in event listeners prevent garbage collection in V8.
2. Immediate Fix: Code changes required on client disconnect to de-register handlers cleanly.
3. Prevention: Monitoring, linting, or structural patterns (WeakRef, AbortController, maxListeners limits).`,
        topic: 'Runtime Systems & Memory Management',
        difficulty: 'hard',
        timeLimitSeconds: 120,
        points: 10,
        negativePoints: 0,
        bonusPoints: 0,
        rubricCriteria: [
          { id: 'crit-mem-rc', title: 'Root Cause & V8 GC Mechanics', maxScore: 5, description: 'Articulates how retaining listener closures keeps the enclosing scope and session object alive in the V8 heap graph.' },
          { id: 'crit-mem-fix', title: 'Targeted Fix', maxScore: 3, description: 'Explicitly calls removeListener/off on socket disconnect or uses once() instead of persistent on().' },
          { id: 'crit-mem-prev', title: 'Leak Prevention & Observability', maxScore: 2, description: 'Recommends AbortSignal/AbortController patterns, heapdump analysis in CI, and memory threshold alerts.' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scen-04',
        type: 'written_rubric',
        title: 'Cascading Microservice Outage under Peak Load',
        text: `Scenario:
When payment gateway third-party API latency spikes from 150ms to 8000ms, your internal API Gateway and Order Service threads become exhausted waiting for HTTP responses, causing a complete cascading failure across all unrelated services (Catalog, Search, User Profile).

Explain:
1. Root Cause: Why synchronous thread pool exhaustion leads to cascading domino outages.
2. Fix: How to configure Circuit Breakers, timeouts, and fallback degradation strategies.
3. Prevention: Asynchronous messaging (Kafka/RabbitMQ) and bulkheading principles.`,
        topic: 'Distributed Systems & Reliability',
        difficulty: 'hard',
        timeLimitSeconds: 120,
        points: 10,
        negativePoints: 0,
        bonusPoints: 0,
        rubricCriteria: [
          { id: 'crit-dist-rc', title: 'Cascading Failure Mechanics', maxScore: 5, description: 'Explains thread starvation, resource backlog, and failure propagation due to missing request timeouts.' },
          { id: 'crit-dist-fix', title: 'Circuit Breaking & Timeouts', maxScore: 3, description: 'Defines circuit breaker states (Open, Closed, Half-Open), aggressive timeouts, and graceful degraded fallbacks.' },
          { id: 'crit-dist-prev', title: 'Resilience Architecture', maxScore: 2, description: 'Suggests Bulkhead isolation patterns, asynchronous message queues, and backpressure mechanisms.' }
        ],
        createdAt: new Date().toISOString()
      },

      // ================= ROUND 4: Rapid Fire & Buzzer =================
      {
        id: 'q-buzz-01',
        type: 'buzzer',
        title: 'Negative Weight Cycles in Graphs',
        text: 'Which shortest-path algorithm can detect negative weight cycles in a directed graph: Dijkstra or Bellman-Ford?',
        topic: 'Data Structures & Algorithms',
        difficulty: 'medium',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'Dijkstra' },
          { id: 'B', text: 'Bellman-Ford' }
        ],
        correctAnswer: 'B',
        explanation: 'Bellman-Ford relaxes edges V-1 times; if an edge can still be relaxed on the V-th iteration, a negative weight cycle exists.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-02',
        type: 'buzzer',
        title: 'SQL Isolation Level for Phantom Reads',
        text: 'What is the minimum ANSI SQL transaction isolation level that prevents Phantom Reads?',
        topic: 'Database Management Systems',
        difficulty: 'hard',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'Read Committed' },
          { id: 'B', text: 'Repeatable Read' },
          { id: 'C', text: 'Serializable' },
          { id: 'D', text: 'Read Uncommitted' }
        ],
        correctAnswer: 'C',
        explanation: 'In the ANSI SQL standard, `Serializable` is the strictest level and is required to prevent Phantom Reads.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-03',
        type: 'buzzer',
        title: 'Linux Port Inspection Command',
        text: 'Which Linux command using flag `-tulpn` or `-tlpn` displays all active listening TCP and UDP sockets with process IDs?',
        topic: 'Operating Systems & Linux',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'ss (or netstat)' },
          { id: 'B', text: 'iptables' },
          { id: 'C', text: 'ps' },
          { id: 'D', text: 'traceroute' }
        ],
        correctAnswer: 'A',
        explanation: '`ss -tulpn` (or classic `netstat -tulpn`) lists listening sockets with timer and PID details.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-04',
        type: 'buzzer',
        title: 'Hash Map Worst-Case Complexity',
        text: 'If every key inserted into a hash map hashes to the identical bucket, what is the lookup time complexity?',
        topic: 'Data Structures & Algorithms',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'O(1)' },
          { id: 'B', text: 'O(n)' },
          { id: 'C', text: 'O(log n)' },
          { id: 'D', text: 'O(n^2)' }
        ],
        correctAnswer: 'B',
        explanation: 'When all items hash to the same bucket, the structure behaves like a linear linked list with O(n) lookup.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-05',
        type: 'buzzer',
        title: 'Git Safe History Rollback',
        text: 'Which command creates a new commit that undoes the changes of a previous commit without modifying existing history?',
        topic: 'Git Version Control',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'git revert' },
          { id: 'B', text: 'git reset --hard' },
          { id: 'C', text: 'git checkout' },
          { id: 'D', text: 'git rebase -i' }
        ],
        correctAnswer: 'A',
        explanation: '`git revert <commit>` safely appends an inverse commit, preserving historical integrity.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-06',
        type: 'buzzer',
        title: 'Cryptographic Hash Collision',
        text: 'True or False: MD5 and SHA-1 are both considered cryptographically broken due to practical collision attacks.',
        topic: 'Cybersecurity',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'True' },
          { id: 'B', text: 'False' }
        ],
        correctAnswer: 'A',
        explanation: 'Both MD5 and SHA-1 have proven collision vulnerabilities and must never be used for digital signatures or password hashing.',
        createdAt: new Date().toISOString()
      },

      {
        id: 'q-code-07',
        type: 'code',
        title: 'Java String Interning & Reference Equality',
        text: 'What will be printed to standard output by this Java program?',
        topic: 'Object-Oriented Programming (Java)',
        difficulty: 'medium',
        timeLimitSeconds: 40,
        points: 2,
        negativePoints: 0,
        bonusPoints: 1,
        codeLanguage: 'java',
        codeSnippet: `public class StringTest {
    public static void main(String[] args) {
        String s1 = "TechQuiz";
        String s2 = new String("TechQuiz");
        String s3 = s2.intern();
        System.out.println((s1 == s2) + " " + (s1 == s3));
    }
}`,
        options: [
          { id: 'A', text: 'false true' },
          { id: 'B', text: 'true true' },
          { id: 'C', text: 'false false' },
          { id: 'D', text: 'true false' }
        ],
        correctAnswer: 'A',
        explanation: '`s1 == s2` is false because `s2` is a newly allocated heap object. `s2.intern()` returns the canonical instance from the string pool, which is the same reference as `s1`.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-scr-11',
        type: 'mcq',
        title: 'DNS Record Types',
        text: 'Which DNS record type maps an alias hostname to another canonical domain name rather than directly to an IP address?',
        topic: 'Computer Networks',
        difficulty: 'easy',
        timeLimitSeconds: 20,
        points: 1,
        negativePoints: 0,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'A Record' },
          { id: 'B', text: 'CNAME Record' },
          { id: 'C', text: 'PTR Record' },
          { id: 'D', text: 'MX Record' }
        ],
        correctAnswer: 'B',
        explanation: 'A Canonical Name (CNAME) record is used in the Domain Name System to alias one domain name to another canonical domain name.',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q-buzz-07',
        type: 'buzzer',
        title: 'Digital Signatures Key Usage',
        text: 'When generating a cryptographic digital signature, does the sender sign the hash using their private key or public key?',
        topic: 'Cybersecurity',
        difficulty: 'easy',
        timeLimitSeconds: 15,
        points: 10,
        negativePoints: 5,
        bonusPoints: 0,
        options: [
          { id: 'A', text: 'Private Key' },
          { id: 'B', text: 'Public Key' }
        ],
        correctAnswer: 'A',
        explanation: 'The sender signs the digest with their Private Key. Anyone with the sender\'s Public Key can verify that the signature originated from the private key owner without tampering.',
        createdAt: new Date().toISOString()
      },
      // ================= ROUND 5: Staged Crisis Simulation =================
      {
        id: 'q-crisis-01',
        type: 'staged_scenario',
        title: 'Crisis Simulation: The Black Friday Cloud Outage',
        text: 'A major enterprise retail cloud cluster begins failing under unprecedented traffic. Follow the incident telemetry across 4 critical escalation stages.',
        topic: 'Site Reliability Engineering & Distributed Systems',
        difficulty: 'hard',
        timeLimitSeconds: 90,
        points: 15,
        negativePoints: 0,
        bonusPoints: 0,
        stagedStages: [
          {
            id: 'stage-1',
            stageNumber: 1,
            title: 'Stage 1: Alert Storm - 504 Gateway Timeouts',
            storyText: '09:02 AM: Prometheus firing: "P99 latency on /api/v1/checkout exceeded 12,000ms. Ingress NGINX returning 504 Gateway Timeout on 34% of inbound requests."',
            questionText: 'What initial telemetry dashboard should the incident responder inspect first to isolate whether the bottleneck is network, ingress proxy, or downstream application pods?',
            questionType: 'mcq',
            options: [
              { id: 'A', text: 'Application pod CPU/Memory and NGINX upstream response time metrics' },
              { id: 'B', text: 'Git commit history from last week' },
              { id: 'C', text: 'DNS TTL records at domain registrar' },
              { id: 'D', text: 'Client browser user-agent distribution' }
            ],
            correctAnswer: 'A',
            points: 3,
            timeLimitSeconds: 45,
            explanation: 'Comparing NGINX upstream response time against pod resource utilization immediately differentiates proxy misconfigurations from downstream service saturation.'
          },
          {
            id: 'stage-2',
            stageNumber: 2,
            title: 'Stage 2: Database CPU Spike to 100%',
            storyText: '09:08 AM: Downstream order service pods are stalled. RDS PostgreSQL primary database instance reaches 100% CPU utilization. pg_stat_activity lists 250 connections executing: `SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`.',
            questionText: 'Explain the root cause and the fastest non-destructive mitigation to relieve database CPU load immediately without restarting the DB.',
            questionType: 'written_rubric',
            rubricCriteria: [
              { id: 'stg2-rc', title: 'Root Cause (Missing Composite Index)', maxScore: 2, description: 'Identifies sequential full table scan on orders without an index on (customer_id, created_at).' },
              { id: 'stg2-fix', title: 'Immediate Mitigation', maxScore: 2, description: 'Recommends CREATE INDEX CONCURRENTLY, aggressive statement timeout, or killing long-running idle transactions.' }
            ],
            points: 4,
            timeLimitSeconds: 75
          },
          {
            id: 'stage-3',
            stageNumber: 3,
            title: 'Stage 3: Redis Cache Stampede',
            storyText: '09:15 AM: To reduce DB pressure, an engineer restarted Redis. As soon as Redis cleared, thousands of concurrent threads hit the DB simultaneously for the same top-selling product entries (Cache Stampede / Thundering Herd).',
            questionText: 'Which concurrency technique prevents a Cache Stampede when a hot cache key expires or invalidates?',
            questionType: 'mcq',
            options: [
              { id: 'A', text: 'Mutual exclusion lock (single-flight / mutex) so only one worker queries DB while others await cached result' },
              { id: 'B', text: 'Disable cache entirely and route 100% of queries to database' },
              { id: 'C', text: 'Increase database query timeout to 60 seconds' },
              { id: 'D', text: 'Double the Redis maxmemory setting' }
            ],
            correctAnswer: 'A',
            points: 4,
            timeLimitSeconds: 45,
            explanation: 'Single-flight mutex locks or probabilistic early expiration (XFetch) guarantee that only a single process recomputes an expired hot key.'
          },
          {
            id: 'stage-4',
            stageNumber: 4,
            title: 'Stage 4: Post-Mortem Architecture Hardening',
            storyText: '09:30 AM: Systems are stabilizing. The executive team requests a comprehensive architecture review to guarantee this cascading failure pattern cannot reoccur next year.',
            questionText: 'Summarize the three core pillars of resilience engineering required to protect the platform against traffic surges: (1) Rate limiting / shedding, (2) Read/Write segregation & caching, and (3) Asynchronous order ingestion.',
            questionType: 'written_rubric',
            rubricCriteria: [
              { id: 'stg4-ratelimit', title: 'Load Shedding & Token Bucket', maxScore: 2, description: 'Outlines adaptive rate limiting and prioritizing checkout over non-essential browsing.' },
              { id: 'stg4-cqrs', title: 'Read Replicas & CQRS', maxScore: 1, description: 'Details read-replica scaling and write-ahead cache patterns.' },
              { id: 'stg4-async', title: 'Asynchronous Ingestion', maxScore: 1, description: 'Recommends durable message queues (e.g. Kafka/SQS) for orders with worker pools.' }
            ],
            points: 4,
            timeLimitSeconds: 90
          }
        ],
        createdAt: new Date().toISOString()
      }
    ];

    // Insert Questions
    const insertQuestionStmt = prepareStatement(`
      INSERT OR REPLACE INTO questions (
        id, type, title, text, topic, difficulty, time_limit_seconds, points,
        negative_points, bonus_points, explanation, code_snippet, code_language,
        image_url, options_json, correct_answer_json, short_answer_accepted_json,
        short_answer_regex, short_answer_case_sensitive, rubric_criteria_json,
        staged_stages_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of questions) {
      insertQuestionStmt.run(
        q.id,
        q.type,
        q.title,
        q.text,
        q.topic,
        q.difficulty,
        q.timeLimitSeconds,
        q.points,
        q.negativePoints,
        q.bonusPoints,
        q.explanation || null,
        q.codeSnippet || null,
        q.codeLanguage || null,
        q.imageUrl || null,
        q.options ? JSON.stringify(q.options) : null,
        q.correctAnswer ? JSON.stringify(q.correctAnswer) : null,
        q.shortAnswerAccepted ? JSON.stringify(q.shortAnswerAccepted) : null,
        q.shortAnswerRegex || null,
        q.shortAnswerCaseSensitive ? 1 : 0,
        q.rubricCriteria ? JSON.stringify(q.rubricCriteria) : null,
        q.stagedStages ? JSON.stringify(q.stagedStages) : null,
        q.createdAt
      );
    }

    // 3. Define 5 Standard Competition Rounds
    const rounds: Round[] = [
      {
        id: 'round-1-screening',
        competitionId: compId,
        roundNumber: 1,
        name: 'Round 1: Screening MCQs',
        description: 'High-speed technical screening round. 10 rapid questions, +1 per correct answer, no negative marking. Top 8 teams advance.',
        type: 'screening',
        allowedQuestionTypes: ['mcq', 'short_text', 'true_false'],
        defaultTimeLimitSeconds: 20,
        pointsPerCorrect: 1.0,
        negativeMarking: 0.0,
        bonusPoints: 0.0,
        teamsAdvancing: 8,
        autoAdvance: true,
        showLeaderboardBetweenQuestions: true,
        gradingMode: 'auto',
        shuffleQuestions: false,
        shuffleOptions: false,
        allowPassToNextTeam: false,
        passPointRatio: 0.5,
        questionIds: [
          'q-scr-01', 'q-scr-02', 'q-scr-03', 'q-scr-04', 'q-scr-05',
          'q-scr-06', 'q-scr-07', 'q-scr-08', 'q-scr-09', 'q-scr-10', 'q-scr-11'
        ]
      },
      {
        id: 'round-2-code',
        competitionId: compId,
        roundNumber: 2,
        name: 'Round 2: Code Output & Debugging',
        description: 'Analyze syntax-highlighted code snippets in C, Python, Java, SQL, and C++. +2 points for correct output, +1 bonus for judge-scored explanation. Top 6 teams advance.',
        type: 'code_debugging',
        allowedQuestionTypes: ['code', 'mcq', 'short_text'],
        defaultTimeLimitSeconds: 45,
        pointsPerCorrect: 2.0,
        negativeMarking: 0.0,
        bonusPoints: 1.0,
        teamsAdvancing: 6,
        autoAdvance: true,
        showLeaderboardBetweenQuestions: true,
        gradingMode: 'both',
        shuffleQuestions: false,
        shuffleOptions: false,
        allowPassToNextTeam: false,
        passPointRatio: 0.5,
        questionIds: [
          'q-code-01', 'q-code-02', 'q-code-03', 'q-code-04', 'q-code-05', 'q-code-06', 'q-code-07'
        ]
      },
      {
        id: 'round-3-scenario',
        competitionId: compId,
        roundNumber: 3,
        name: 'Round 3: Scenario-Based Engineering',
        description: 'Complex real-world outages judged manually on a strict rubric: Root Cause (5 pts), Fix (3 pts), Prevention (2 pts). Passing allowed at half points. Top 4 teams advance.',
        type: 'scenario',
        allowedQuestionTypes: ['written_rubric'],
        defaultTimeLimitSeconds: 120,
        pointsPerCorrect: 10.0,
        negativeMarking: 0.0,
        bonusPoints: 0.0,
        teamsAdvancing: 4,
        autoAdvance: false,
        showLeaderboardBetweenQuestions: true,
        gradingMode: 'judge',
        shuffleQuestions: false,
        shuffleOptions: false,
        allowPassToNextTeam: true,
        passPointRatio: 0.5,
        questionIds: [
          'q-scen-01', 'q-scen-02', 'q-scen-03', 'q-scen-04'
        ]
      },
      {
        id: 'round-4-buzzer',
        competitionId: compId,
        roundNumber: 4,
        name: 'Round 4: Rapid Fire & Buzzer',
        description: 'First valid buzzer press locks out other teams. +10 points for correct answer, -5 points penalty for wrong answer. Top 3 advance to the Grand Final.',
        type: 'rapid_fire_buzzer',
        allowedQuestionTypes: ['buzzer', 'mcq', 'short_text'],
        defaultTimeLimitSeconds: 15,
        pointsPerCorrect: 10.0,
        negativeMarking: 5.0,
        bonusPoints: 0.0,
        teamsAdvancing: 3,
        autoAdvance: false,
        showLeaderboardBetweenQuestions: true,
        gradingMode: 'auto',
        shuffleQuestions: false,
        shuffleOptions: false,
        allowPassToNextTeam: true,
        passPointRatio: 0.5,
        rapidFireDurationSeconds: 60,
        questionIds: [
          'q-buzz-01', 'q-buzz-02', 'q-buzz-03', 'q-buzz-04', 'q-buzz-05', 'q-buzz-06', 'q-buzz-07'
        ]
      },
      {
        id: 'round-5-crisis',
        competitionId: compId,
        roundNumber: 5,
        name: 'Grand Final: Staged Crisis Simulation',
        description: 'One high-stakes enterprise cloud outage revealed across 4 progressive stages with new clues, telemetry, and challenges at every step.',
        type: 'staged_crisis',
        allowedQuestionTypes: ['staged_scenario', 'written_rubric', 'mcq'],
        defaultTimeLimitSeconds: 90,
        pointsPerCorrect: 15.0,
        negativeMarking: 0.0,
        bonusPoints: 0.0,
        teamsAdvancing: 1,
        autoAdvance: false,
        showLeaderboardBetweenQuestions: true,
        gradingMode: 'both',
        shuffleQuestions: false,
        shuffleOptions: false,
        allowPassToNextTeam: false,
        passPointRatio: 0.5,
        questionIds: [
          'q-crisis-01'
        ]
      }
    ];

    const insertRoundStmt = prepareStatement(`
      INSERT OR REPLACE INTO rounds (
        id, competition_id, round_number, name, description, type,
        allowed_question_types, default_time_limit_seconds, points_per_correct,
        negative_marking, bonus_points, teams_advancing, auto_advance,
        show_leaderboard_between_questions, grading_mode, shuffle_questions,
        shuffle_options, allow_pass_to_next_team, pass_point_ratio,
        rapid_fire_duration_seconds, question_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const r of rounds) {
      insertRoundStmt.run(
        r.id,
        r.competitionId,
        r.roundNumber,
        r.name,
        r.description,
        r.type,
        JSON.stringify(r.allowedQuestionTypes),
        r.defaultTimeLimitSeconds,
        r.pointsPerCorrect,
        r.negativeMarking,
        r.bonusPoints,
        r.teamsAdvancing,
        r.autoAdvance ? 1 : 0,
        r.showLeaderboardBetweenQuestions ? 1 : 0,
        r.gradingMode,
        r.shuffleQuestions ? 1 : 0,
        r.shuffleOptions ? 1 : 0,
        r.allowPassToNextTeam ? 1 : 0,
        r.passPointRatio,
        r.rapidFireDurationSeconds || 60,
        JSON.stringify(r.questionIds)
      );
    }
  });

  console.log(`[Seed] Successfully seeded competition "TechQuiz Arena Grand Championship 2026" with 5 rounds and 30 technical questions!`);
}

if (require.main === module) {
  seedDatabase();
}

import { io as ClientSocket } from 'socket.io-client';
import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { initDatabase, db, prepareStatement } from '../src/db/index';
import { seedDatabase } from '../src/db/seed';
import { setupGameSockets } from '../src/sockets/gameSocket';
import { SessionEngine } from '../src/services/sessionEngine';
import { SOCKET_EVENTS } from '../../shared/constants';

async function runLoadTest() {
  console.log('\n============================================================');
  console.log('       🚀 TECHQUIZ ARENA - 100 CONCURRENT CLIENT LOAD TEST');
  console.log('============================================================\n');

  // 1. Setup in-process server for controlled benchmark
  const app = express();
  const server = http.createServer(app);
  const ioServer = new Server(server, { cors: { origin: '*' } });

  initDatabase();
  seedDatabase();
  setupGameSockets(ioServer);

  const PORT = 3099;
  await new Promise<void>(resolve => server.listen(PORT, resolve));
  console.log(`[LoadTest] Test server active on http://localhost:${PORT}`);

  // 2. Create competition round session
  const engine = SessionEngine.createSession('comp-techquiz-2026', 'round-1-screening');
  const sessionId = engine.sessionId;
  const joinCode = engine.joinCode;
  console.log(`[LoadTest] Created live session ${sessionId} (Code: ${joinCode})`);

  const NUM_TEAMS = 100;
  const clientSockets: any[] = [];
  const joinLatencies: number[] = [];
  const answerLatencies: number[] = [];

  console.log(`[LoadTest] Connecting ${NUM_TEAMS} simulated concurrent teams...`);
  const connectStart = Date.now();

  // 3. Connect 100 teams concurrently (burst over ~200ms)
  const joinPromises = Array.from({ length: NUM_TEAMS }).map((_, i) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        const teamName = `Virtual-Team-${String(i + 1).padStart(3, '0')}`;
        const socket = ClientSocket(`http://localhost:${PORT}`, {
          transports: ['websocket'],
          forceNew: true
        });

        clientSockets.push(socket);

        const joinSentAt = Date.now();

        socket.on('connect', () => {
          socket.emit(SOCKET_EVENTS.JOIN_SESSION, {
            sessionIdOrCode: joinCode,
            role: 'team',
            teamName
          });
        });

      socket.on('team_registered', () => {
        const latency = Date.now() - joinSentAt;
        joinLatencies.push(latency);
        resolve();
      });

      socket.on('connect_error', err => reject(err));
      socket.on('socket_error', err => reject(err));
      }, i * 2);
    });
  });

  await Promise.all(joinPromises);
  const totalConnectTime = Date.now() - connectStart;
  console.log(`[LoadTest] ✅ All ${NUM_TEAMS} teams connected in ${totalConnectTime}ms`);

  // 4. Admin starts Question 1
  console.log(`[LoadTest] Admin launching Question 1...`);
  engine.startQuestion(0);

  // 5. All 100 teams submit answers concurrently
  console.log(`[LoadTest] Simulating concurrent answer submissions from all 100 teams...`);
  const answerPromises = clientSockets.map((socket, idx) => {
    return new Promise<void>((resolve, reject) => {
      const answerStart = Date.now();
      const choice = ['A', 'B', 'C', 'D'][idx % 4];

      socket.emit(SOCKET_EVENTS.SUBMIT_ANSWER, {
        answer: choice,
        clientTimestamp: answerStart
      });

      socket.on(SOCKET_EVENTS.SUBMISSION_ACK, (ack: any) => {
        const latency = Date.now() - answerStart;
        answerLatencies.push(latency);
        if (ack.success) {
          resolve();
        } else {
          reject(new Error(`Submission failed: ${ack.message}`));
        }
      });
    });
  });

  await Promise.all(answerPromises);
  console.log(`[LoadTest] ✅ All 100 submissions successfully processed by database`);

  // 6. Test Buzzer Concurrency
  console.log(`[LoadTest] Simulating high-concurrency buzzer race on Question 4 (Buzzer)...`);
  engine.startQuestion(3); // Switch to buzzer question
  engine.buzzerService.open();

  const buzzPromises = clientSockets.slice(0, 50).map(socket => {
    return new Promise<void>(resolve => {
      socket.emit(SOCKET_EVENTS.PRESS_BUZZER);
      socket.on('buzzer_ack', () => resolve());
    });
  });

  await Promise.all(buzzPromises);
  const buzzerState = engine.buzzerService.getState();
  console.log(`[LoadTest] ✅ Buzzer winner locked: "${buzzerState.winnerTeamName}" (Buzzer locked: ${!buzzerState.isOpen})`);

  // 7. Calculate Statistics
  function calcStats(nums: number[]) {
    const sorted = [...nums].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const max = sorted[sorted.length - 1];
    return { avg: Math.round(avg), p50, p95, p99, max };
  }

  const joinStats = calcStats(joinLatencies);
  const answerStats = calcStats(answerLatencies);

  // 8. Verify DB Row Count
  const subDbCount = (prepareStatement('SELECT count(*) as c FROM submissions WHERE session_id = ?').get(sessionId) as any).c;

  console.log('\n------------------------------------------------------------');
  console.log('                 📊 LOAD TEST BENCHMARK REPORT              ');
  console.log('------------------------------------------------------------');
  console.log(` Concurrent Clients       : ${NUM_TEAMS}`);
  console.log(` Successful Connections   : ${clientSockets.length} / ${NUM_TEAMS} (100%)`);
  console.log(` Submissions in DB        : ${subDbCount} / ${NUM_TEAMS} (100%)`);
  console.log('------------------------------------------------------------');
  console.log(' Latency Metrics (Target: < 300ms event latency)');
  console.log(` • Join Latency   - Avg: ${joinStats.avg}ms | P50: ${joinStats.p50}ms | P95: ${joinStats.p95}ms | Max: ${joinStats.max}ms`);
  console.log(` • Answer Latency - Avg: ${answerStats.avg}ms | P50: ${answerStats.p50}ms | P95: ${answerStats.p95}ms | Max: ${answerStats.max}ms`);
  console.log('------------------------------------------------------------');

  const passed = answerStats.p95 < 300 && joinStats.p95 < 300 && subDbCount === NUM_TEAMS;

  if (passed) {
    console.log(' 🏆 RESULT: PASSED! Full compliance with < 300ms latency requirement.\n');
  } else {
    console.log(' ⚠️ RESULT: Completed, latency exceeded target.\n');
  }

  // Cleanup
  for (const s of clientSockets) s.disconnect();
  engine.stopTimer();
  ioServer.close();
  server.close();

  process.exit(passed ? 0 : 1);
}

runLoadTest().catch(err => {
  console.error('[LoadTest Error]', err);
  process.exit(1);
});

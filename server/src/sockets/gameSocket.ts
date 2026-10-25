import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../../../shared/constants';
import { SessionEngine } from '../services/sessionEngine';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';

interface SocketData {
  sessionId?: string;
  role?: 'admin' | 'projector' | 'judge' | 'team';
  teamId?: string;
  teamName?: string;
}

export function setupGameSockets(io: Server): void {
  // Map of active session engines listening for events
  const subscribedEngines = new Set<string>();

  function attachEngineListeners(engine: SessionEngine): void {
    if (subscribedEngines.has(engine.sessionId)) return;
    subscribedEngines.add(engine.sessionId);

    // Broadcast state updates to the session room
    engine.subscribeState(state => {
      io.to(`session:${engine.sessionId}`).emit(SOCKET_EVENTS.SESSION_UPDATED, state);
    });

    // Broadcast timer ticks to the session room
    engine.subscribeTimer(remainingMs => {
      io.to(`session:${engine.sessionId}`).emit(SOCKET_EVENTS.TIMER_TICK, { remainingMs });
    });
  }

  const teamListDebounceTimers = new Map<string, NodeJS.Timeout>();
  function broadcastTeamList(sessionId: string, engine: SessionEngine): void {
    if (!teamListDebounceTimers.has(sessionId)) {
      const timer = setTimeout(() => {
        teamListDebounceTimers.delete(sessionId);
        const teams = engine.getTeams();
        io.to(`session:${sessionId}:admin`).emit(SOCKET_EVENTS.TEAM_LIST_CHANGED, teams);
        io.to(`session:${sessionId}:projector`).emit(SOCKET_EVENTS.TEAM_LIST_CHANGED, teams);
      }, 50);
      teamListDebounceTimers.set(sessionId, timer);
    }
  }

  const subCountDebounceTimers = new Map<string, NodeJS.Timeout>();
  function broadcastSubmissionCount(sessionId: string, count: number): void {
    if (!subCountDebounceTimers.has(sessionId)) {
      const timer = setTimeout(() => {
        subCountDebounceTimers.delete(sessionId);
        io.to(`session:${sessionId}:admin`).emit('submission_count_updated', { submissionsCount: count });
        io.to(`session:${sessionId}:projector`).emit('submission_count_updated', { submissionsCount: count });
      }, 40);
      subCountDebounceTimers.set(sessionId, timer);
    }
  }

  io.on('connection', (socket: Socket<any, any, any, SocketData>) => {
    // 1. Clock drift synchronization (Ping-Pong)
    socket.on(SOCKET_EVENTS.TIME_SYNC_PING, (data: { clientSendTime: number }) => {
      socket.emit(SOCKET_EVENTS.TIME_SYNC_PONG, {
        clientSendTime: data?.clientSendTime || Date.now(),
        serverReceiveTime: Date.now()
      });
    });

    // 2. Join Session (Teams, Projector, Admin, Judges)
    socket.on(
      SOCKET_EVENTS.JOIN_SESSION,
      async (data: {
        sessionIdOrCode: string;
        role: 'team' | 'admin' | 'projector' | 'judge';
        teamName?: string;
        token?: string;
      }) => {
        try {
          const { sessionIdOrCode, role, teamName, token } = data;
          if (!sessionIdOrCode) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session ID or join code required' });
            return;
          }

          const engine = SessionEngine.getOrCreateEngine(sessionIdOrCode);
          attachEngineListeners(engine);

          const room = `session:${engine.sessionId}`;
          socket.join(room);
          socket.data.sessionId = engine.sessionId;
          socket.data.role = role;

          if (role === 'team') {
            if (!teamName) {
              socket.emit(SOCKET_EVENTS.ERROR, { message: 'Team name is required' });
              return;
            }

            const reg = engine.registerOrReconnectTeam(teamName);
            socket.data.teamId = reg.team.id;
            socket.data.teamName = reg.team.name;

            socket.emit(SOCKET_EVENTS.SESSION_UPDATED, engine.getState());
            socket.emit('team_registered', {
              team: reg.team,
              token: reg.token,
              isNew: reg.isNew
            });

            // Notify admin & projector of team list change efficiently
            broadcastTeamList(engine.sessionId, engine);
          } else if (role === 'admin') {
            socket.join(`${room}:admin`);
            socket.emit(SOCKET_EVENTS.SESSION_UPDATED, engine.getState());
            socket.emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, engine.getLeaderboard());
          } else if (role === 'projector') {
            socket.join(`${room}:projector`);
            socket.emit(SOCKET_EVENTS.SESSION_UPDATED, engine.getState());
            socket.emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, engine.getLeaderboard());
          } else if (role === 'judge') {
            socket.join(`${room}:judges`);
            socket.emit(SOCKET_EVENTS.SESSION_UPDATED, engine.getState());
          }
        } catch (err: any) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
        }
      }
    );

    // 3. Reconnect Team using stored token
    socket.on(
      SOCKET_EVENTS.RECONNECT_TEAM,
      async (data: { sessionIdOrCode: string; token: string }) => {
        try {
          const { sessionIdOrCode, token } = data;
          if (!sessionIdOrCode || !token) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session and token required for reconnect' });
            return;
          }

          const engine = SessionEngine.getOrCreateEngine(sessionIdOrCode);
          attachEngineListeners(engine);

          const team = engine.getTeamByToken(token);
          if (!team) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid or expired team session token' });
            return;
          }

          const room = `session:${engine.sessionId}`;
          socket.join(room);
          socket.data.sessionId = engine.sessionId;
          socket.data.role = 'team';
          socket.data.teamId = team.id;
          socket.data.teamName = team.name;

          socket.emit(SOCKET_EVENTS.SESSION_UPDATED, engine.getState());
          socket.emit('team_registered', { team, token, isNew: false });
        } catch (err: any) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
        }
      }
    );

    // 4. Submit Answer
    socket.on(
      SOCKET_EVENTS.SUBMIT_ANSWER,
      async (data: { answer: any; clientTimestamp?: number }) => {
        try {
          const { sessionId, teamId } = socket.data;
          if (!sessionId || !teamId) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Not connected to a session as a team' });
            return;
          }

          const engine = SessionEngine.getOrCreateEngine(sessionId);
          const result = engine.submitAnswer(teamId, data.answer, data.clientTimestamp);

          socket.emit(SOCKET_EVENTS.SUBMISSION_ACK, result);

          if (result.success) {
            broadcastSubmissionCount(sessionId, engine.getState().submissionsCount);
          }
        } catch (err: any) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
        }
      }
    );

    // 5. Press Buzzer
    socket.on(SOCKET_EVENTS.PRESS_BUZZER, () => {
      try {
        const { sessionId, teamId, teamName } = socket.data;
        if (!sessionId || !teamId || !teamName) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: 'Must be a registered team to press buzzer' });
          return;
        }

        const engine = SessionEngine.getOrCreateEngine(sessionId);
        const result = engine.buzzerService.pressBuzzer(teamId, teamName);

        socket.emit('buzzer_ack', result);

        if (result.isWinner) {
          io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.BUZZER_WINNER, {
            teamId,
            teamName,
            buzzTime: result.buzzTime
          });
        }

        io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.BUZZER_STATE_CHANGED, result.state);
      } catch (err: any) {
        socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
      }
    });

    // 6. Admin Actions
    socket.on(
      SOCKET_EVENTS.ADMIN_ACTION,
      async (data: { action: string; payload?: any; token?: string }) => {
        try {
          const { action, payload, token } = data;
          const { sessionId } = socket.data;

          if (!sessionId) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session ID not found on socket' });
            return;
          }

          // Verify admin token if provided or check role
          if (token) {
            try {
              const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { role: string };
              if (decoded.role !== 'admin') throw new Error('Not admin');
            } catch {
              socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid admin token' });
              return;
            }
          }

          const engine = SessionEngine.getOrCreateEngine(sessionId);

          switch (action) {
            case 'start_question':
              engine.startQuestion(payload?.questionIndex || 0);
              break;
            case 'next_question':
              engine.nextQuestion();
              break;
            case 'next_stage':
              engine.nextStage();
              break;
            case 'pause_timer':
              engine.pauseTimer();
              break;
            case 'resume_timer':
              engine.resumeTimer();
              break;
            case 'reveal_answer':
              engine.revealAnswer();
              break;
            case 'show_leaderboard':
              engine.showLeaderboard();
              io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, engine.getLeaderboard());
              break;
            case 'reopen_buzzer':
              engine.buzzerService.reopen();
              io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.BUZZER_STATE_CHANGED, engine.buzzerService.getState());
              break;
            case 'lock_buzzer':
              engine.buzzerService.lock();
              io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.BUZZER_STATE_CHANGED, engine.buzzerService.getState());
              break;
            case 'set_allow_reanswer':
              engine.setAllowReanswer(Boolean(payload?.allow));
              break;
            case 'end_round':
              engine.endRound();
              break;
            default:
              socket.emit(SOCKET_EVENTS.ERROR, { message: `Unknown admin action: ${action}` });
          }
        } catch (err: any) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
        }
      }
    );

    // 7. Judge Score submission via socket
    socket.on(
      SOCKET_EVENTS.SUBMIT_JUDGE_SCORE,
      async (data: { submissionId: string; rubricScores: Record<string, number>; comments?: string }) => {
        try {
          const { sessionId } = socket.data;
          if (!sessionId) return;
          const engine = SessionEngine.getOrCreateEngine(sessionId);
          engine.submitJudgeScore(data.submissionId, 'Judge', data.rubricScores, data.comments || '');
          io.to(`session:${sessionId}`).emit(SOCKET_EVENTS.LEADERBOARD_UPDATED, engine.getLeaderboard());
        } catch (err: any) {
          socket.emit(SOCKET_EVENTS.ERROR, { message: err.message });
        }
      }
    );

    // 8. Disconnect handling
    socket.on('disconnect', () => {
      // Mark team as temporarily disconnected if applicable
      if (socket.data.teamId && socket.data.sessionId) {
        // We do NOT eliminate them! Reconnecting with token restores them instantly.
      }
    });
  });
}

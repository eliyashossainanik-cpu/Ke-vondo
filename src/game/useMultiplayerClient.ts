import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientMessage,
  PlayerColorId,
  PublicRoomSummary,
  RoomSnapshot,
  ServerMessage,
} from '../shared/types';
import { soundEngine, type MemeSoundId } from '../audio/soundEngine';

export function useMultiplayerClient(
  onShake?: (amount: number) => void,
  onClueNotice?: (title: string, detail: string) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;
  const onClueNoticeRef = useRef(onClueNotice);
  onClueNoticeRef.current = onClueNotice;

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return wsRef.current;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);

    ws.onopen = () => {
      setConnected(true);
      setErrorMsg(null);
      ws.send(JSON.stringify({ type: 'room:list' }));
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setErrorMsg('WebSocket connection interrupted.');
    };

    ws.onmessage = (ev) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMessage;
      } catch {
        return;
      }

      if (msg.type === 'room:joined') {
        setLocalPlayerId(msg.playerId);
        setSnapshot(msg.snapshot);
        setErrorMsg(null);
      } else if (msg.type === 'room:state') {
        setSnapshot(msg.snapshot);
      } else if (msg.type === 'room:list_result') {
        setPublicRooms(msg.rooms);
      } else if (msg.type === 'room:error') {
        setErrorMsg(msg.message);
      } else if (msg.type === 'clue:result') {
        soundEngine.playClueScan();
        onClueNoticeRef.current?.(msg.title, msg.detail);
      } else if (msg.type === 'meme:play') {
        soundEngine.playMeme(msg.memeId as MemeSoundId);
      } else if (msg.type === 'sfx:event') {
        if (msg.kind === 'kill') {
          soundEngine.playKill();
          onShakeRef.current?.(0.7);
        } else if (msg.kind === 'report') {
          soundEngine.playMeetingBell('body');
          onShakeRef.current?.(0.5);
        } else if (msg.kind === 'meeting') {
          soundEngine.playMeetingBell('emergency');
          onShakeRef.current?.(0.45);
        } else if (msg.kind === 'sabotage') {
          soundEngine.playSabotage();
          onShakeRef.current?.(0.5);
        } else if (msg.kind === 'task') {
          soundEngine.playTaskComplete();
        } else if (msg.kind === 'vent') {
          soundEngine.playVent();
        } else if (msg.kind === 'eject') {
          soundEngine.playEject();
        } else if (msg.kind === 'door') {
          soundEngine.playDoorSlam();
          onShakeRef.current?.(0.35);
        } else if (msg.kind === 'shield') {
          soundEngine.playShieldBlock();
          onShakeRef.current?.(0.3);
        } else if (msg.kind === 'disguise') {
          soundEngine.playDisguise();
        }
      }
    };

    wsRef.current = ws;
    return ws;
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback(
    (payload: ClientMessage) => {
      const ws = connect();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
      } else {
        ws.addEventListener(
          'open',
          () => {
            ws.send(JSON.stringify(payload));
          },
          { once: true },
        );
      }
    },
    [connect],
  );

  const createRoom = useCallback(
    (name: string, color: PlayerColorId) => {
      setErrorMsg(null);
      send({ type: 'room:create', name, color });
    },
    [send],
  );

  const joinRoom = useCallback(
    (roomCode: string, name: string, color: PlayerColorId) => {
      setErrorMsg(null);
      send({ type: 'room:join', roomCode, name, color });
    },
    [send],
  );

  const refreshRooms = useCallback(() => {
    send({ type: 'room:list' });
  }, [send]);

  const disconnectRoom = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setLocalPlayerId(null);
    setSnapshot(null);
    setConnected(false);
  }, []);

  return {
    connected,
    localPlayerId,
    snapshot,
    publicRooms,
    errorMsg,
    clearError: () => setErrorMsg(null),
    connect,
    send,
    createRoom,
    joinRoom,
    refreshRooms,
    disconnectRoom,
  };
}

"use strict";

/**
 * Repository Pattern: isolates ALL Nakama SDK calls.
 * No React, no hooks, no state inside this class.
 * Benefits:
 *   - Independently testable without a real Nakama server
 *   - Clear I/O boundary — easy to swap SDK version
 *   - React components never import from @heroiclabs/nakama-js directly
 */

import { Client } from "@heroiclabs/nakama-js";
import { OpCode }  from "../types/game.js";

export class NakamaService {
  constructor(host, port, useSSL, serverKey) {
    this.client  = new Client(serverKey, host, port, useSSL);
    this.useSSL  = useSSL;
    this.session = null;
    this.socket  = null;
  }

  // Uses stable device ID so the same username always maps to the same Nakama account.
  // No password friction — frictionless entry for a game demo.
  async authenticate(username) {
    var deviceId  = "neon-ttt-" + username.toLowerCase().replace(/[^a-z0-9]/g, "");
    this.session  = await this.client.authenticateDevice(deviceId, true, username);
    return this.session;
  }

  // Connects the realtime socket and wires up event handlers.
  // handlers = { onMatchData(opCode, rawString), onDisconnect(), onError() }
  async connectSocket(session, handlers) {
    if (this.socket) this.socket.disconnect(false);

    this.socket = this.client.createSocket(this.useSSL, false);

    this.socket.ondisconnect = handlers.onDisconnect;
    this.socket.onerror      = handlers.onError;

    this.socket.onmatchdata = function(evt) {
      var raw = evt.data;
      var str;
      if (raw instanceof Uint8Array) {
        str = new TextDecoder().decode(raw);
      } else if (typeof raw === "string") {
        str = raw;
      } else {
        str = "";
      }
      if (str) handlers.onMatchData(evt.op_code, str);
    };

    await this.socket.connect(session, true);
    return this.socket;
  }

  async callRpc(name, payload) {
    var resp = await this.client.rpc(this.session, name, payload);
    // nakama-js may return payload as already-parsed object or as a string
    var p = resp.payload;
    if (typeof p === "string")               return JSON.parse(p);
    if (typeof p === "object" && p !== null)  return p;
    return {};
  }

  async joinMatch(matchId) {
    return this.socket.joinMatch(matchId);
  }

  // Encodes position as Uint8Array — backend reads it via nk.binaryToString()
  sendMove(matchId, position) {
    var encoded = new TextEncoder().encode(JSON.stringify({ position: position }));
    this.socket.sendMatchState(matchId, OpCode.MOVE, encoded);
  }

  async leaveMatch(matchId) {
    return this.socket.leaveMatch(matchId);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect(false);
      this.socket  = null;
      this.session = null;
    }
  }
}

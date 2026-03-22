"use strict";

// Shared constants — must match Op object in backend/src/index.js exactly.
export var OpCode = Object.freeze({
  MOVE:      1,
  STATE:     2,
  GAME_OVER: 3,
  TICK:      4,
  READY:     5,
});

/**
 * @typedef {Object} GameState
 * @property {string[]} board
 * @property {Object.<string,string>} marks
 * @property {Object.<string,string>} playerInfo
 * @property {string[]} players
 * @property {string} turn
 * @property {number} turnTimer
 * @property {boolean} gameOver
 * @property {boolean} [isAiMatch]
 */

/**
 * @typedef {Object} GameOverPayload
 * @property {string|null} winner
 * @property {string} winnerMark
 * @property {"win"|"draw"|"timeout"|"opponent_left"} reason
 * @property {string[]} board
 * @property {number[]} [winLine]
 * @property {Object.<string,string>} [playerInfo]
 */

/**
 * @typedef {Object} LeaderboardEntry
 * @property {string} ownerId
 * @property {string} username
 * @property {number} score
 * @property {number} rank
 */

/**
 * @typedef {Object} PlayerStats
 * @property {number} wins
 * @property {number} losses
 * @property {number} draws
 */

/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} username
 */

/**
 * @typedef {"login"|"lobby"|"game"|"leaderboard"} Screen
 */

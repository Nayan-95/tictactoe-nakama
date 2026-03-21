import { useEffect, useRef, useState } from 'react'
import { Client } from '@heroiclabs/nakama-js'
import './App.css'

const initialBoard = ['', '', '', '', '', '', '', '', '']
const nakamaHost = import.meta.env.VITE_NAKAMA_HOST || '127.0.0.1'
const nakamaPort = import.meta.env.VITE_NAKAMA_PORT || '7350'
const nakamaSSL = import.meta.env.VITE_NAKAMA_USE_SSL === 'true'

function normalizeMark(mark) {
  if (mark === 'Y') {
    return 'O'
  }

  return mark || ''
}

function buildAccountEmail(username) {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')
  return `${normalized}@tictactoe.com`
}

async function getErrorMessage(error, fallbackMessage) {
  if (error && typeof error.json === 'function') {
    try {
      const payload = await error.json()
      if (payload?.message) {
        return payload.message
      }
    } catch {
      return fallbackMessage
    }
  }

  if (error?.message) {
    return error.message
  }

  return fallbackMessage
}

function collectPlayerNames(match, fallbackUsername) {
  const nextNames = {}
  const allPresences = [...(match.presences || []), match.self].filter(Boolean)

  allPresences.forEach((presence) => {
    if (presence.user_id) {
      nextNames[presence.user_id] = presence.username || fallbackUsername || 'Player'
    }
  })

  return nextNames
}

async function connectAuthenticatedUser({ client, username, password, createAccount }) {
  const email = buildAccountEmail(username)
  return client.authenticateEmail(email, password, createAccount, username)
}

function App() {
  const clientRef = useRef(null)
  const sessionRef = useRef(null)
  const socketRef = useRef(null)
  const errorTimeoutRef = useRef(null)

  const [screen, setScreen] = useState('login')
  const [board, setBoard] = useState(initialBoard)
  const [currentTurn, setCurrentTurn] = useState(null)
  const [matchId, setMatchId] = useState('')
  const [myUserId, setMyUserId] = useState('')
  const [marks, setMarks] = useState({})
  const [players, setPlayers] = useState([])
  const [playerNames, setPlayerNames] = useState({})
  const [resultData, setResultData] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [searchStatus, setSearchStatus] = useState('')
  const [ticket, setTicket] = useState('')
  const [flashMessage, setFlashMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current)
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  const showFlashMessage = (message) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
    }

    setFlashMessage(message)
    errorTimeoutRef.current = setTimeout(() => {
      setFlashMessage('')
    }, 2500)
  }

  const resetGameState = () => {
    setBoard(initialBoard)
    setCurrentTurn(null)
    setMatchId('')
    setMarks({})
    setPlayers([])
    setPlayerNames({})
    setResultData(null)
    setTicket('')
    setFlashMessage('')
  }

  const attachSocketHandlers = (socket) => {
    socket.onmatchmakermatched = async (matched) => {
      try {
        const match = await socket.joinMatch(matched.match_id, matched.token)

        setMatchId(match.match_id)
        setPlayerNames(collectPlayerNames(match, sessionRef.current?.username || username))
        setSearchStatus('Match found! Joining game...')
        setScreen('game')
      } catch (error) {
        console.error('Failed to join matched game:', error)
        setSearchStatus('Could not join the match. Please try again.')
        showFlashMessage('Unable to join the matched game.')
      }
    }

    socket.onmatchdata = (matchData) => {
      const opCode = matchData.op_code
      const decoded = new TextDecoder().decode(matchData.data)
      const payload = decoded ? JSON.parse(decoded) : {}

      if (opCode === 2) {
        setBoard(Array.isArray(payload.board) ? payload.board.map(normalizeMark) : initialBoard)
        setCurrentTurn(payload.currentTurn ?? null)
        setPlayers(Array.isArray(payload.players) ? payload.players : [])
        setMarks(payload.marks || {})
      }

      if (opCode === 3) {
        showFlashMessage(payload.message || 'Something went wrong.')
      }

      if (opCode === 4) {
        setResultData(payload)
        setScreen('result')
      }
    }

    socket.ondisconnect = () => {
      setSearchStatus('Disconnected from server.')
    }
  }

  const completeAuth = async (session, client, trimmedUsername) => {
    let socket

    try {
      socket = client.createSocket(false, false)
      await socket.connect(session, true)
      console.log('Socket connected')
    } catch (error) {
      console.error('Socket connection failed:', error)
      showFlashMessage('Could not connect to Nakama. Check that it is running locally.')
      setIsBusy(false)
      return
    }

    clientRef.current = client
    sessionRef.current = session
    socketRef.current = socket

    setMyUserId(session.user_id)
    setUsername(trimmedUsername)
    resetGameState()
    setPlayerNames({ [session.user_id]: session.username || trimmedUsername })
    attachSocketHandlers(socket)
    setScreen('lobby')
    setIsBusy(false)
  }

  const createClient = () => {
    return new Client('defaultkey', nakamaHost, nakamaPort, nakamaSSL, 7000, false)
  }

  const handleLogin = async () => {
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      showFlashMessage('Please enter a username.')
      return
    }

    if (!password.trim()) {
      showFlashMessage('Please enter a password.')
      return
    }

    if (password.trim().length < 8) {
      showFlashMessage('Password must be at least 8 characters.')
      return
    }

    setIsBusy(true)
    setSearchStatus('')

    let client
    let session

    try {
      client = createClient()
      console.log('Client created')
    } catch (error) {
      console.error('Client creation failed:', error)
      showFlashMessage('Could not connect to Nakama. Check that it is running locally.')
      setIsBusy(false)
      return
    }

    try {
      session = await connectAuthenticatedUser({
        client,
        username: trimmedUsername,
        password,
        createAccount: false,
      })
      console.log('Session:', session)
    } catch (error) {
      console.error('Authentication failed:', error)
      showFlashMessage(await getErrorMessage(error, 'Login failed. Check your username and password.'))
      setIsBusy(false)
      return
    }

    await completeAuth(session, client, trimmedUsername)
  }

  const handleSignup = async () => {
    const trimmedUsername = username.trim()
    if (!trimmedUsername) {
      showFlashMessage('Please enter a username.')
      return
    }

    if (!password.trim()) {
      showFlashMessage('Please enter a password.')
      return
    }

    if (password.trim().length < 8) {
      showFlashMessage('Password must be at least 8 characters.')
      return
    }

    setIsBusy(true)
    setSearchStatus('')

    let client
    let session

    try {
      client = createClient()
      console.log('Client created')
    } catch (error) {
      console.error('Client creation failed:', error)
      showFlashMessage('Could not connect to Nakama. Check that it is running locally.')
      setIsBusy(false)
      return
    }

    try {
      session = await connectAuthenticatedUser({
        client,
        username: trimmedUsername,
        password,
        createAccount: true,
      })
      console.log('Session:', session)

      if (!session.created) {
        showFlashMessage('Username already exists. Please choose another one.')
        setIsBusy(false)
        return
      }
    } catch (error) {
      console.error('Signup failed:', error)
      showFlashMessage(await getErrorMessage(error, 'Sign up failed. Username may already exist.'))
      setIsBusy(false)
      return
    }

    await completeAuth(session, client, trimmedUsername)
  }

  const handleFindMatch = async () => {
    if (!clientRef.current || !sessionRef.current || !socketRef.current) {
      showFlashMessage('You are not connected yet.')
      return
    }

    setIsBusy(true)
    setSearchStatus('Searching for opponent...')
    resetGameState()

    try {
      const result = await socketRef.current.addMatchmaker('*', 2, 2)
      const nextTicket = result.ticket

      setTicket(nextTicket)
      setSearchStatus('Searching for opponent...')
    } catch (error) {
      console.error('Find match failed:', error)
      setSearchStatus('Matchmaking failed. Please try again.')
      showFlashMessage('Unable to start matchmaking.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCellClick = async (index) => {
    if (screen !== 'game' || !socketRef.current || !matchId) {
      return
    }

    if (currentTurn !== myUserId) {
      showFlashMessage("It's not your turn yet.")
      return
    }

    if (board[index] !== '') {
      showFlashMessage('That square is already taken.')
      return
    }

    try {
      const movePayload = JSON.stringify({ position: index })
      console.log('Sending move:', { matchId, index, movePayload, currentTurn, myUserId })
      await socketRef.current.sendMatchState(matchId, 1, movePayload)
    } catch (error) {
      console.error('Failed to send move:', error)
      showFlashMessage('Could not send your move.')
    }
  }

  const handlePlayAgain = () => {
    resetGameState()
    setSearchStatus('')
    setScreen('lobby')
  }

  const myMark = normalizeMark(marks[myUserId] || (players[0] === myUserId ? 'X' : players[1] === myUserId ? 'O' : ''))
  const opponentId = players.find((playerId) => playerId !== myUserId) || ''
  const opponentMark = normalizeMark(opponentId ? marks[opponentId] : myMark === 'X' ? 'O' : 'X')
  const myName = playerNames[myUserId] || username || 'You'
  const opponentName = playerNames[opponentId] || 'Opponent'
  const turnLabel = currentTurn === myUserId ? 'Your turn' : currentTurn ? "Opponent's turn" : 'Waiting for game state...'
  const winner = resultData?.winner ?? null
  const reason = resultData?.reason ?? ''

  let resultTitle = 'Game Over'
  if (reason === 'draw' || winner === null) {
    resultTitle = 'Draw 🤝'
  } else if (winner === myUserId) {
    resultTitle = 'You Win! 🎉'
  } else {
    resultTitle = 'You Lose 😞'
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <section className="app-card">
        {screen === 'login' && (
          <div className="panel panel-center">
            <p className="eyebrow">Log In</p>
            <h1>Tic-Tac-Toe</h1>
            <p className="panel-copy">Log in with your saved account to continue playing.</p>

            <label className="input-group" htmlFor="username">
              <span>Enter your username</span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleLogin()
                  }
                }}
                placeholder="PlayerOne"
                maxLength={24}
                autoComplete="off"
              />
            </label>

            <label className="input-group" htmlFor="password">
              <span>Enter your password</span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleLogin()
                  }
                }}
                placeholder="Password"
                maxLength={64}
                autoComplete="current-password"
              />
            </label>

            <button className="primary-button" onClick={handleLogin} disabled={isBusy}>
              {isBusy ? 'Connecting...' : 'Login'}
            </button>

            <p className="status-text">
              New here?{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setPassword('')
                  setScreen('signup')
                }}
              >
                Create account
              </button>
            </p>
          </div>
        )}

        {screen === 'signup' && (
          <div className="panel panel-center">
            <p className="eyebrow">Create Account</p>
            <h1>Sign Up</h1>
            <p className="panel-copy">Choose a unique username and password. Your account will be stored in Nakama.</p>

            <label className="input-group" htmlFor="signup-username">
              <span>Choose a username</span>
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSignup()
                  }
                }}
                placeholder="PlayerOne"
                maxLength={24}
                autoComplete="username"
              />
            </label>

            <label className="input-group" htmlFor="signup-password">
              <span>Choose a password</span>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSignup()
                  }
                }}
                placeholder="Password"
                maxLength={64}
                autoComplete="new-password"
              />
            </label>

            <button className="primary-button" onClick={handleSignup} disabled={isBusy}>
              {isBusy ? 'Creating Account...' : 'Sign Up'}
            </button>

            <p className="status-text">
              Already have an account?{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setPassword('')
                  setScreen('login')
                }}
              >
                Log in
              </button>
            </p>
          </div>
        )}

        {screen === 'lobby' && (
          <div className="panel panel-center">
            <p className="eyebrow">Lobby</p>
            <h1>Welcome, {username}!</h1>
            <p className="panel-copy">Ready when you are. We’ll pair you with another player automatically.</p>

            <button className="primary-button large-button" onClick={handleFindMatch} disabled={isBusy}>
              {isBusy ? 'Finding Match...' : 'Find Match'}
            </button>

            <p className="status-text">{searchStatus || 'Tap the button to start matchmaking.'}</p>
            {ticket && <p className="subtle-text">Ticket: {ticket}</p>}
          </div>
        )}

        {screen === 'game' && (
          <div className="panel game-panel">
            <div className="game-header">
              <div>
                <p className="eyebrow">Live Match</p>
                <h1>{myName} ({myMark || 'X'}) vs {opponentName} ({opponentMark || 'O'})</h1>
              </div>
              <div className="pill">{turnLabel}</div>
            </div>

            <div className="player-row">
              <div className={`player-chip ${currentTurn === myUserId ? 'active' : ''}`}>
                <span className="player-label">You</span>
                <strong>{myName}</strong>
              </div>
              <div className={`player-chip ${currentTurn && currentTurn !== myUserId ? 'active' : ''}`}>
                <span className="player-label">Opponent</span>
                <strong>{opponentName}</strong>
              </div>
            </div>

            <div className="board" role="grid" aria-label="Tic-Tac-Toe board">
              {board.map((cell, index) => (
                <button
                  key={index}
                  type="button"
                  className="cell"
                  onClick={() => handleCellClick(index)}
                  disabled={cell !== '' || currentTurn !== myUserId}
                  aria-label={`Cell ${index + 1}${cell ? ` ${cell}` : ''}`}
                >
                  {cell}
                </button>
              ))}
            </div>

            <div className="game-footer">
              <p className="status-text">{opponentId ? 'Match in progress.' : 'Waiting for opponent...'}</p>
              {matchId && <p className="subtle-text">Match ID: {matchId}</p>}
            </div>
          </div>
        )}

        {screen === 'result' && (
          <div className="panel panel-center">
            <p className="eyebrow">Result</p>
            <h1>{resultTitle}</h1>
            <p className="panel-copy">
              {reason === 'opponent_left'
                ? 'Opponent left the game'
                : reason === 'draw'
                  ? 'Nobody took the final line this round.'
                  : winner === myUserId
                    ? 'Nice work. You closed out the board first.'
                    : 'Your opponent completed the winning line first.'}
            </p>

            <button className="primary-button" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        )}

        {flashMessage && <div className="toast">{flashMessage}</div>}
      </section>
    </main>
  )
}

export default App

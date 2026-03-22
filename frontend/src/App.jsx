import { useEffect } from "react";
import { useGameStore }   from "./store/useGameStore.js";
import { useNakama }      from "./hooks/useNakama.js";
import LoginScreen       from "./components/screens/LoginScreen.jsx";
import LobbyScreen       from "./components/screens/LobbyScreen.jsx";
import GameScreen        from "./components/screens/GameScreen.jsx";
import LeaderboardScreen from "./components/screens/LeaderboardScreen.jsx";
import Toast             from "./components/ui/Toast.jsx";

export default function App() {
  var store  = useGameStore();
  var nakama = useNakama();

  // Refresh stats whenever the lobby becomes visible
  useEffect(function() {
    if (store.screen === "lobby" && store.user) nakama.refreshStats();
  }, [store.screen]);

  // Refresh stats as soon as a game ends so overlay shows updated numbers
  useEffect(function() {
    if (store.gameOver && store.user) nakama.refreshStats();
  }, [store.gameOver]);

  return (
    <>
      {store.user && (
        <div className={"connection-bar " + (store.connected ? "is-connected" : "is-disconnected")}>
          <span className="connection-dot" />
          {store.connected ? "CONNECTED" : "RECONNECTING..."}
        </div>
      )}

      {store.screen === "login"       && <LoginScreen       nakama={nakama} />}
      {store.screen === "lobby"       && <LobbyScreen       nakama={nakama} />}
      {store.screen === "game"        && <GameScreen        nakama={nakama} />}
      {store.screen === "leaderboard" && <LeaderboardScreen nakama={nakama} />}

      {store.toastMessage && (
        <Toast message={store.toastMessage} onDismiss={store.clearToast} />
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type Side = "left" | "right";

const initialRounds = ["win", "win", "loss", "win"];

function Icon({ name }: { name: "play" | "pause" | "expand" | "upload" | "reset" | "swap" }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "play") return <svg {...common}><path d="m8 5 11 7-11 7V5Z" /></svg>;
  if (name === "pause") return <svg {...common}><path d="M8 5v14M16 5v14" /></svg>;
  if (name === "expand") return <svg {...common}><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5" /></svg>;
  if (name === "upload") return <svg {...common}><path d="M12 16V4M8 8l4-4 4 4M4 20h16" /></svg>;
  if (name === "swap") return <svg {...common}><path d="m7 7 3-3 3 3M10 4v10a4 4 0 0 0 4 4h3M17 17l-3 3-3-3M14 20V10a4 4 0 0 0-4-4H7" /></svg>;
  return <svg {...common}><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" /></svg>;
}

export default function BroadcastBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState({ left: { name: "SENTINELS", tag: "SEN", score: 8, color: "#e96a76", glow: "#bf475a" }, right: { name: "FNATIC", tag: "FNC", score: 6, color: "#ff9b22", glow: "#de8b2c" } });
  const [rounds, setRounds] = useState({ left: initialRounds, right: ["loss", "win", "win", "loss"] });
  const [time, setTime] = useState(59);
  const [running, setRunning] = useState(false);
  const [timeout, setTimeoutState] = useState<Side | null>(null);
  const [timeoutsLeft, setTimeoutsLeft] = useState<{ left: number; right: number }>({ left: 2, right: 2 });
  const [eventName, setEventName] = useState("CHAMPIONS SEOUL · GRAND FINAL");
  const [logo, setLogo] = useState<string | null>(null);
  const [teamLogos, setTeamLogos] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setTime((value) => value > 0 ? value - 1 : 0), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const updateTeam = (side: Side, key: "name" | "tag" | "color" | "glow", value: string) => setTeams((prev) => ({ ...prev, [side]: { ...prev[side], [key]: key === "color" || key === "glow" ? value : value.toUpperCase() } }));
  const score = (side: Side, change: number) => setTeams((prev) => ({ ...prev, [side]: { ...prev[side], score: Math.max(0, prev[side].score + change) } }));
  const toggleRound = (side: Side, index: number) => setRounds((prev) => {
    const row = [...prev[side]];
    row[index] = row[index] === "win" ? "loss" : row[index] === "loss" ? "pending" : "win";
    return { ...prev, [side]: row };
  });
  const chooseLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setLogo(URL.createObjectURL(file));
  };
  const chooseTeamLogo = (side: Side, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setTeamLogos((prev) => ({ ...prev, [side]: URL.createObjectURL(file) }));
  };
  const callTimeout = (side: Side) => {
    if (timeout === side) return setTimeoutState(null);
    if (timeoutsLeft[side] === 0) return;
    setTimeoutState(side);
    setTimeoutsLeft((prev) => ({ ...prev, [side]: prev[side] - 1 }));
  };
  const reset = () => { setTime(59); setRunning(false); setTimeoutState(null); setTimeoutsLeft({ left: 2, right: 2 }); setTeams((prev) => ({ ...prev, left: { ...prev.left, score: 0 }, right: { ...prev.right, score: 0 } })); };
  const fullscreen = async () => { if (boardRef.current && document.fullscreenElement !== boardRef.current) await boardRef.current.requestFullscreen(); else await document.exitFullscreen(); };
  const formatTime = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;

  return (
    <div className="broadcast-shell">
      <div className="broadcast-heading">
        <div><p className="eyebrow">VLR CIRCUIT / LIVE PRODUCTION</p><h1>Broadcast scoreboard</h1><p>Run your tournament overlay from one clean control room.</p></div>
        <div className="live-pill"><span /> LIVE CONTROL</div>
      </div>

      <section className="broadcast-stage" ref={boardRef} aria-label="Live scoreboard preview" style={{ "--left-glow": teams.left.glow, "--right-glow": teams.right.glow } as React.CSSProperties}>
        <div className="stage-topline"><span>{eventName}</span></div>
        <div className="stage-glow stage-glow-left" /><div className="stage-glow stage-glow-right" />
        <div className="scoreboard">
          <TeamPanel side="left" team={teams.left} logo={teamLogos.left} timeoutsLeft={timeoutsLeft.left} timeoutActive={timeout === "left"} onTimeout={() => callTimeout("left")} rounds={rounds.left} onRound={(i) => toggleRound("left", i)} onScore={() => score("left", 1)} />
          <div className="center-score">
            <div className="event-mark" title="Tournament logo">
              {logo ? <img src={logo} alt="Tournament logo" /> : <span className="spike-mark"><i /><i /><i /></span>}
            </div>
            <button className={`round-clock ${time < 11 ? "critical" : ""}`} onClick={() => setRunning((value) => !value)} title={running ? "Pause timer" : "Start timer"}>{formatTime}</button>
            <span className="timeout-indicator">{timeout ? `${teams[timeout].tag} TIMEOUT` : "NO TIMEOUT"}</span>
          </div>
          <TeamPanel side="right" team={teams.right} logo={teamLogos.right} timeoutsLeft={timeoutsLeft.right} timeoutActive={timeout === "right"} onTimeout={() => callTimeout("right")} rounds={rounds.right} onRound={(i) => toggleRound("right", i)} onScore={() => score("right", 1)} />
        </div>
        <div className="fullscreen-exit-hint">Press ESC to leave fullscreen</div>
      </section>

      <section className="control-deck">
        <div className="control-title"><div><p className="eyebrow">OPERATOR DESK</p><h2>Match controls</h2></div><button className="icon-button" onClick={fullscreen}><Icon name="expand" /> Present fullscreen</button></div>
        <div className="control-grid">
          <article className="control-card team-controls">
            <ControlTeam label="Left team" side="left" team={teams.left} update={updateTeam} changeScore={score} timeout={timeout} timeoutsLeft={timeoutsLeft.left} onTimeout={callTimeout} onChooseLogo={chooseTeamLogo} hasLogo={Boolean(teamLogos.left)} />
            <button className="swap-button" onClick={() => setTeams((p) => ({ left: p.right, right: p.left }))} title="Swap team sides"><Icon name="swap" /></button>
            <ControlTeam label="Right team" side="right" team={teams.right} update={updateTeam} changeScore={score} timeout={timeout} timeoutsLeft={timeoutsLeft.right} onTimeout={callTimeout} onChooseLogo={chooseTeamLogo} hasLogo={Boolean(teamLogos.right)} />
          </article>
          <article className="control-card clock-card"><span className="card-label">ROUND CLOCK</span><div className="clock-readout">{formatTime}</div><div className="clock-buttons"><button onClick={() => setTime((t) => Math.max(0, t - 10))}>−10</button><button className="play-button" onClick={() => setRunning(!running)}><Icon name={running ? "pause" : "play"} /> {running ? "Pause" : "Start"}</button><button onClick={() => setTime((t) => t + 10)}>+10</button></div><button className="reset-button" onClick={reset}><Icon name="reset" /> Reset match</button></article>
          <article className="control-card event-card"><span className="card-label">EVENT IDENTITY</span><label>Tournament <input value={eventName} onChange={(e) => setEventName(e.target.value.toUpperCase())} /></label><input ref={logoInput} type="file" accept="image/*" onChange={chooseLogo} hidden /><button className="upload-button" onClick={() => logoInput.current?.click()}><Icon name="upload" /> {logo ? "Replace center logo" : "Upload center logo"}</button><p>Your tournament emblem replaces the spike in the overlay.</p></article>
        </div>
        <p className="fullscreen-note">Tip: click any round diamond in the preview to cycle win, loss, and pending. The controls stay hidden in fullscreen.</p>
      </section>
    </div>
  );
}

function TeamPanel({ side, team, logo, timeoutsLeft, timeoutActive, onTimeout, rounds, onRound, onScore }: { side: Side; team: { name: string; tag: string; score: number; color: string }; logo: string | null; timeoutsLeft: number; timeoutActive: boolean; onTimeout: () => void; rounds: string[]; onRound: (index: number) => void; onScore: () => void }) {
  return <div className={`team-panel ${side} ${timeoutActive ? "timeout-active" : ""}`} style={{ "--team": team.color } as React.CSSProperties}><div className="team-ident"><div className="team-emblem">{logo ? <img src={logo} alt={`${team.name} logo`} /> : team.tag.slice(0, 1)}</div><div><span>{team.name}</span><b>{team.tag}</b><div className="timeout-gems" aria-label={`${timeoutsLeft} timeouts remaining`}>{[0, 1].map((gem) => <button key={gem} disabled={gem >= timeoutsLeft} onClick={onTimeout} className={gem < timeoutsLeft ? "available" : "used"} aria-label={gem < timeoutsLeft ? `Call a timeout for ${team.name}` : "Timeout already used"} />)}</div></div></div><button className={`score-number ${team.score > 99 ? "compact-score" : ""}`} onClick={onScore} title={`Add a point for ${team.name}`} aria-label={`Add a point for ${team.name}`}>{team.score}</button><div className="round-track">{rounds.map((status, index) => <button key={index} onClick={() => onRound(index)} className={`round-diamond ${status}`} aria-label={`${team.name} round ${index + 1}: ${status}`}><i /></button>)}</div></div>;
}

function ControlTeam({ label, side, team, update, changeScore, timeout, timeoutsLeft, onTimeout, onChooseLogo, hasLogo }: { label: string; side: Side; team: { name: string; tag: string; score: number; color: string; glow: string }; update: (side: Side, key: "name" | "tag" | "color" | "glow", value: string) => void; changeScore: (side: Side, change: number) => void; timeout: Side | null; timeoutsLeft: number; onTimeout: (side: Side) => void; onChooseLogo: (side: Side, event: React.ChangeEvent<HTMLInputElement>) => void; hasLogo: boolean }) {
  const teamLogoInput = useRef<HTMLInputElement>(null);
  return <div className="team-control"><span className="card-label">{label}</span><div className="team-inputs"><input value={team.name} onChange={(e) => update(side, "name", e.target.value)} aria-label={`${label} name`} /><input className="tag-input" value={team.tag} maxLength={4} onChange={(e) => update(side, "tag", e.target.value)} aria-label={`${label} tag`} /></div><div className="score-controls"><button onClick={() => changeScore(side, -1)}>−</button><strong>{team.score}</strong><button onClick={() => changeScore(side, 1)}>+</button><button disabled={timeoutsLeft === 0 && timeout !== side} className={`timeout-button ${timeout === side ? "active" : ""}`} onClick={() => onTimeout(side)}>{timeout === side ? "Timeout active" : timeoutsLeft ? `Call timeout (${timeoutsLeft})` : "No timeouts left"}</button></div><div className="team-branding"><input ref={teamLogoInput} type="file" accept="image/*" onChange={(event) => onChooseLogo(side, event)} hidden /><button className="team-logo-button" onClick={() => teamLogoInput.current?.click()}><Icon name="upload" /> {hasLogo ? "Replace logo" : "Add team logo"}</button><label className="banner-colour" title="Banner colour"><input type="color" value={team.color} onChange={(event) => update(side, "color", event.target.value)} /><span>Banner</span></label><label className="banner-colour" title="Background glow colour"><input type="color" value={team.glow} onChange={(event) => update(side, "glow", event.target.value)} /><span>Glow</span></label></div></div>;
}

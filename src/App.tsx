import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { FlaskConical, Info, Phone, Utensils, Volume2, Wine } from 'lucide-react';
import defaultImage from '@/assets/pearl-default.png';
import laughImage from '@/assets/pearl-laugh.png';
import groanImage from '@/assets/pearl-groan.png';
import laughSound from '@/assets/sounds/pearl-laugh.mp3';
import gagSound from '@/assets/sounds/pearl-gag.mp3';
import noSound from '@/assets/sounds/pearl-no.mp3';
import yesSound from '@/assets/sounds/pearl-yes.mp3';
import pickUpSound from '@/assets/sounds/phone-pick-up.mp3';
import hangUpSound from '@/assets/sounds/phone-hang-up.mp3';
import greetingSound from '@/assets/sounds/hi-my-name-is-tom-pearl.mp3';
import drinkSound from '@/assets/sounds/freesound_community-drinking-coffe-107121.mp3';
import eatSound from '@/assets/sounds/pearl-eat.mp3';
import { useVoiceActivity } from '@/useVoiceActivity';

type Reaction = 'default' | 'laugh' | 'groan' | 'no' | 'yes';
type CallState = 'idle' | 'ringing' | 'connected';
type TreatKind = 'drink' | 'eat';
type Treat = { id: number; kind: TreatKind };

const REACTIONS: Exclude<Reaction, 'default'>[] = ['laugh', 'groan', 'no', 'yes'];
const RING_MS = 1400;
const MIC_ERROR = 'Allow microphone access so Pearl can hear you.';
const TREAT_MS = 3200; // how long a glass or plate stays on screen
const MAX_TREATS = 6; // spamming the buttons stacks up to this many at once
const TREAT_SOUNDS: Record<TreatKind, { src: string; ms: number }> = {
  drink: { src: drinkSound, ms: 2400 },
  eat: { src: eatSound, ms: 900 },
};
const GREETING_MS = 14000;
const MAX_SOUND_MS = 8000; // safety net if a sound never finishes

// Pearl's secret mood: laughs cheer him up, "no" and gags annoy him.
const MOOD_CHANGE: Record<Exclude<Reaction, 'default'>, number> = { laugh: 1, groan: -1, no: -1, yes: 0 };
const MOOD_MAX = 2;
const MOOD_HANG_UP = -3; // at or below this, Pearl hangs up himself

const images: Record<Reaction, string> = {
  default: defaultImage,
  laugh: laughImage,
  groan: groanImage,
  no: defaultImage,
  yes: defaultImage,
};
const alts: Record<Reaction, string> = {
  default: 'Pearl sitting in his armchair',
  laugh: 'Pearl laughing',
  groan: 'Pearl groaning',
  no: 'Pearl shaking his head no',
  yes: 'Pearl nodding yes',
};
const soundFiles: Partial<Record<Reaction, string>> = {
  laugh: laughSound,
  groan: gagSound,
  no: noSound,
  yes: yesSound,
};

// Browsers only allow sound after a tap, so "unlock" each clip during the call tap.
function unlock(a: HTMLAudioElement) {
  a.muted = true;
  a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
}

function Chair({ layer }: { layer: 'back' | 'front' }) {
  const id = `fabric-${layer}`;
  return (
    <svg className={`chair chair-${layer}`} viewBox="0 0 400 460" aria-hidden="true">
      <defs>
        <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="28" height="28" fill="#8a1d2a" />
          <path d="M14 3 L19 14 L14 25 L9 14Z" fill="#a8313d" />
          <circle cx="0" cy="0" r="2.5" fill="#6d1420" />
          <circle cx="28" cy="28" r="2.5" fill="#6d1420" />
        </pattern>
      </defs>
      {layer === 'back' ? (
        <>
          <rect x="62" y="410" width="28" height="50" rx="4" fill="#4a2616" />
          <rect x="310" y="410" width="28" height="50" rx="4" fill="#4a2616" />
          <rect x="48" y="6" width="304" height="372" rx="120" fill={`url(#${id})`} stroke="#5c121c" strokeWidth="6" />
          {[120, 200, 280].map((x) => (
            <circle key={x} cx={x} cy={x === 200 ? 50 : 72} r="7" fill="#5c121c" />
          ))}
        </>
      ) : (
        <>
          <rect x="40" y="346" width="320" height="96" rx="34" fill={`url(#${id})`} stroke="#5c121c" strokeWidth="6" />
          <rect x="30" y="298" width="340" height="76" rx="36" fill={`url(#${id})`} stroke="#5c121c" strokeWidth="6" />
          <rect x="48" y="306" width="304" height="22" rx="11" fill="#fff" opacity=".1" />
          <rect x="3" y="196" width="96" height="222" rx="44" fill={`url(#${id})`} stroke="#5c121c" strokeWidth="6" />
          <rect x="301" y="196" width="96" height="222" rx="44" fill={`url(#${id})`} stroke="#5c121c" strokeWidth="6" />
        </>
      )}
    </svg>
  );
}

/** An original fuzzy plush body that Pearl's head sits on. */
function Body() {
  return (
    <svg className="body" viewBox="0 0 400 460" aria-hidden="true">
      <defs>
        <radialGradient id="fur-g" cx=".4" cy=".3" r=".8"><stop offset="0" stopColor="#e3c48f"/><stop offset=".6" stopColor="#c49c64"/><stop offset="1" stopColor="#a47d48"/></radialGradient>
        <radialGradient id="belly-g" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#f3e4bd"/><stop offset="1" stopColor="#dcc291"/></radialGradient>
        <radialGradient id="pad-g" cx=".4" cy=".3" r=".8"><stop offset="0" stopColor="#9a7a83"/><stop offset="1" stopColor="#64484f"/></radialGradient>
        <pattern id="fur-p" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M1 8 l2 -5 M6 9 l2 -5 M3.5 4 l1 -3 M8 4 l1.5 -3" stroke="#8f6a38" strokeOpacity=".45" strokeWidth="1.3" strokeLinecap="round" fill="none"/></pattern>
      </defs>
      <ellipse cx="200" cy="372" rx="130" ry="15" fill="#2a0a10" opacity=".35" />
      <g transform="translate(200 400) scale(1.1) translate(-200 -400) translate(0 -30)" stroke="#85612f" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M118 300 Q110 236 200 232 Q290 236 282 300 Q298 380 262 404 Q200 424 138 404 Q102 380 118 300Z" fill="url(#fur-g)"/>
        <path d="M118 300 Q110 236 200 232 Q290 236 282 300 Q298 380 262 404 Q200 424 138 404 Q102 380 118 300Z" fill="url(#fur-p)" stroke="none"/>
        <ellipse cx="200" cy="338" rx="54" ry="64" fill="url(#belly-g)" stroke="none"/><ellipse cx="200" cy="338" rx="54" ry="64" fill="url(#fur-p)" stroke="none" opacity=".6"/>
        <g><ellipse cx="150" cy="418" rx="50" ry="42" fill="url(#fur-g)"/><ellipse cx="150" cy="418" rx="50" ry="42" fill="url(#fur-p)" stroke="none"/>
          <g fill="url(#pad-g)" stroke="#4f373c" strokeWidth="2"><ellipse cx="150" cy="430" rx="22" ry="17"/><ellipse cx="121" cy="406" rx="8" ry="9"/><ellipse cx="138" cy="394" rx="8" ry="9"/><ellipse cx="162" cy="394" rx="8" ry="9"/><ellipse cx="179" cy="406" rx="8" ry="9"/></g></g>
        <g><ellipse cx="250" cy="418" rx="50" ry="42" fill="url(#fur-g)"/><ellipse cx="250" cy="418" rx="50" ry="42" fill="url(#fur-p)" stroke="none"/>
          <g fill="url(#pad-g)" stroke="#4f373c" strokeWidth="2"><ellipse cx="250" cy="430" rx="22" ry="17"/><ellipse cx="221" cy="406" rx="8" ry="9"/><ellipse cx="238" cy="394" rx="8" ry="9"/><ellipse cx="262" cy="394" rx="8" ry="9"/><ellipse cx="279" cy="406" rx="8" ry="9"/></g></g>
        <path d="M130 274 Q92 280 58 268" fill="none" stroke="#85612f" strokeWidth="50"/><path d="M130 274 Q92 280 58 268" fill="none" stroke="url(#fur-g)" strokeWidth="44"/><path d="M130 274 Q92 280 58 268" fill="none" stroke="url(#fur-p)" strokeWidth="44"/>
        <path d="M270 274 Q308 280 342 268" fill="none" stroke="#85612f" strokeWidth="50"/><path d="M270 274 Q308 280 342 268" fill="none" stroke="url(#fur-g)" strokeWidth="44"/><path d="M270 274 Q308 280 342 268" fill="none" stroke="url(#fur-p)" strokeWidth="44"/>
        <ellipse cx="48" cy="262" rx="29" ry="25" fill="url(#fur-g)"/><ellipse cx="352" cy="262" rx="29" ry="25" fill="url(#fur-g)"/>
      </g>
    </svg>
  );
}

function RotaryPhone({ lifted }: { lifted: boolean }) {
  return (
    <svg className={`phone ${lifted ? 'lifted' : ''}`} viewBox="0 0 120 90" aria-hidden="true">
      <path d="M14 62 q-14 6 -10 22 q4 8 14 4" className="cord" />
      <rect x="14" y="42" width="92" height="42" rx="15" className="phone-body" />
      <circle cx="60" cy="63" r="16" className="phone-dial" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={60 + 10 * Math.cos((i * Math.PI) / 3)} cy={63 + 10 * Math.sin((i * Math.PI) / 3)} r="2.3" className="phone-hole" />
      ))}
      <g className="handset">
        <rect x="8" y="22" width="104" height="15" rx="7.5" className="phone-body" />
        <rect x="4" y="26" width="25" height="17" rx="7" className="phone-body" />
        <rect x="91" y="26" width="25" height="17" rx="7" className="phone-body" />
      </g>
    </svg>
  );
}

function HudButton({ label, color, className = '', onClick, children }: { label: string; color: string; className?: string; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`hud-btn ${className}`} style={{ color }} aria-label={label} title={label} onClick={onClick}>
      {children}
    </button>
  );
}

function DrinkProp() {
  return (
    <svg className="treat-prop drink-prop" viewBox="0 0 120 180" aria-label="A glass of beer">
      <path d="M27 25h66l-7 119q-2 19-26 19t-26-19Z" fill="#f6b51b" stroke="#fff" strokeWidth="5" />
      <path d="M28 41h64l-2-16H30Z" fill="#fff8df" opacity=".95" />
      <path d="M29 43h62" stroke="#dda916" strokeWidth="3" opacity=".8" />
      <path d="M29 25h62" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M33 58 39 140M45 58l5 78" stroke="#fff" strokeWidth="4" opacity=".35" strokeLinecap="round" />
    </svg>
  );
}

function FoodProp() {
  return (
    <svg className="treat-prop food-prop" viewBox="0 0 180 150" aria-label="A plate of food">
      <ellipse cx="90" cy="115" rx="76" ry="20" fill="#c8cbd0" stroke="#fff" strokeWidth="5" />
      <ellipse cx="90" cy="103" rx="53" ry="33" fill="#eee" stroke="#d1d4d7" strokeWidth="4" />
      <path d="M52 93c3-25 23-38 43-26 16-17 42-3 35 19 19 13-1 35-22 25-14 16-42 8-43-11-9-1-15-3-13-7Z" fill="#47342c" />
      <circle cx="76" cy="75" r="5" fill="#6b5040" /><circle cx="105" cy="82" r="5" fill="#6b5040" /><circle cx="94" cy="105" r="4" fill="#33251f" />
    </svg>
  );
}

export default function App() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [reaction, setReaction] = useState<Reaction>('default');
  const [hearing, setHearing] = useState(false);
  const [notice, setNotice] = useState('');
  const [treats, setTreats] = useState<Treat[]>([]);
  const [showInfo, setShowInfo] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReaction = useRef<Reaction>('default');
  const callId = useRef(0);
  const sounds = useRef<Partial<Record<Reaction, HTMLAudioElement>>>({});

  const connected = useRef(false);
  const mood = useRef(0);
  const callSounds = useRef<{ pickUp?: HTMLAudioElement; hangUp?: HTMLAudioElement }>({});
  const treatTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const treatId = useRef(0);
  const greeting = useRef<HTMLAudioElement | null>(null);

  const voice = useVoiceActivity({
    onSpeechStart: () => setHearing(true),
    onSpeechEnd: () => react(),
    onIdleTimeout: () => hangUp('Pearl got bored and hung up.'),
  });

  const later = (fn: () => void, ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };

  // Play a sound, then run `next` once it ends (or after maxMs as a safety net).
  function playThen(sound: HTMLAudioElement | undefined, next: () => void, maxMs: number) {
    if (!sound) {
      later(next, 300);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (timer.current) clearTimeout(timer.current);
      sound.onended = null;
      next();
    };
    sound.onended = finish;
    sound.currentTime = 0;
    sound.play().catch(finish);
    later(finish, maxMs);
  }

  // Pearl does a random action (never the same one twice), adjusts his mood, then listens again.
  function react() {
    voice.setListening(false);
    setHearing(false);
    const options = REACTIONS.filter((r) => r !== lastReaction.current);
    const next = options[Math.floor(Math.random() * options.length)];
    lastReaction.current = next;
    mood.current = Math.min(MOOD_MAX, mood.current + MOOD_CHANGE[next]);
    setReaction(next);
    playThen(sounds.current[next], () => {
      setReaction('default');
      if (mood.current <= MOOD_HANG_UP) hangUp('Pearl got annoyed and hung up.');
      else voice.setListening(true);
    }, MAX_SOUND_MS);
  }

  function hangUp(message = '') {
    callId.current += 1;
    if (timer.current) clearTimeout(timer.current);
    voice.stop();
    Object.values(sounds.current).forEach((a) => { a.onended = null; a.pause(); a.currentTime = 0; });
    const pickUp = callSounds.current.pickUp;
    if (pickUp) { pickUp.onended = null; pickUp.pause(); }
    if (connected.current) {
      connected.current = false;
      const bye = callSounds.current.hangUp;
      if (bye) { bye.currentTime = 0; void bye.play().catch(() => {}); }
    }
    setCallState('idle');
    setReaction('default');
    setHearing(false);
    setNotice(message);
  }

  // Every press responds, so the buttons can be spammed: each one adds its own glass/plate and sound.
  function giveTreat(kind: TreatKind) {
    const id = ++treatId.current;
    setTreats((list) => [...list.slice(-(MAX_TREATS - 1)), { id, kind }]);
    const remove = setTimeout(() => {
      treatTimers.current.delete(remove);
      setTreats((list) => list.filter((t) => t.id !== id));
    }, TREAT_MS);
    treatTimers.current.add(remove);
    const { src, ms } = TREAT_SOUNDS[kind];
    void new Audio(src).play().catch(() => {});
    voice.ignoreFor(ms + 400);
  }

  function sayHi() {
    greeting.current ??= new Audio(greetingSound);
    greeting.current.currentTime = 0; // pressing again starts the greeting over
    void greeting.current.play().catch(() => {});
    voice.ignoreFor(GREETING_MS + 400);
  }

  useEffect(() => {
    const timers = treatTimers.current;
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timers.forEach(clearTimeout);
      greeting.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (!showInfo) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setShowInfo(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showInfo]);

  async function callPearl() {
    setNotice('');
    setCallState('ringing');
    if (!Object.keys(sounds.current).length) {
      for (const [name, src] of Object.entries(soundFiles)) sounds.current[name as Reaction] = new Audio(src);
      callSounds.current = { pickUp: new Audio(pickUpSound), hangUp: new Audio(hangUpSound) };
    }
    [...Object.values(sounds.current), ...Object.values(callSounds.current)].forEach(unlock);
    const id = ++callId.current;
    try {
      await voice.start();
    } catch {
      hangUp(MIC_ERROR);
      return;
    }
    if (id !== callId.current) {
      voice.stop(); // hung up while the permission prompt was open
      return;
    }
    later(() => {
      connected.current = true;
      mood.current = 0;
      setCallState('connected');
      playThen(callSounds.current.pickUp, () => voice.setListening(true), 2000);
    }, RING_MS);
  }

  const status =
    callState === 'idle'
      ? notice || 'Tap the green button to call Pearl.'
      : callState === 'ringing'
        ? 'Calling Pearl…'
        : reaction !== 'default'
          ? ''
          : hearing
            ? 'Pearl is listening…'
            : 'Say something.';

  return (
    <main className="stage">
      <section className={`room ${callState}`} aria-label="Talking Pearl">
        <h1 className="sr-only">Talking Pearl</h1>

        <div className="hud-top">
          <HudButton label="About the game" color="#444" className="small push" onClick={() => setShowInfo(true)}><Info size={20} /></HudButton>
        </div>
        <p className="sr-only" aria-live="polite">{status}</p>
        {notice === MIC_ERROR && <p className="toast" role="alert">{notice}</p>}

        <div className="seat-area">
          <Chair layer="back" />
          <Chair layer="front" />
          <Body />
          <div className={`pearl ${hearing ? 'hearing' : ''} react-${reaction}`}>
            <img src={images[reaction]} alt={alts[reaction]} />
          </div>
          {treats.map((treat) => (
            <div key={treat.id} className={`treat-slide ${treat.kind}`} style={{ '--dx': `${((treat.id % 3) - 1) * 7}%` } as CSSProperties}>
              {treat.kind === 'drink' ? <DrinkProp /> : <FoodProp />}
            </div>
          ))}
        </div>

        <div className="side-table">
          <RotaryPhone lifted={callState !== 'idle'} />
        </div>

        <HudButton label="Lab" color="#8a3fb5" className="side-right"><FlaskConical size={26} /></HudButton>

        <div className="hud-bottom">
          <HudButton label="Give Pearl a drink" color="#3d7a3a" onClick={() => giveTreat('drink')}><Wine size={26} /></HudButton>
          <HudButton label="Give Pearl food" color="#7a4a2a" onClick={() => giveTreat('eat')}><Utensils size={26} /></HudButton>
          <HudButton label="Say hi" color="#315d68" onClick={sayHi}><Volume2 size={27} /></HudButton>
          {callState === 'idle' && (
            <button type="button" className="round-btn call" aria-label="Call Pearl" onClick={callPearl}>
              <Phone size={30} />
            </button>
          )}
          {callState === 'ringing' && (
            <button type="button" className="round-btn ring" aria-label="Calling Pearl" disabled>
              <Phone size={30} />
            </button>
          )}
          {callState === 'connected' && (
            <button type="button" className="round-btn hang" aria-label="Hang up" onClick={() => hangUp()}>
              <Phone size={30} />
            </button>
          )}
        </div>
        {showInfo && (
          <div className="info-backdrop" role="presentation" onClick={() => setShowInfo(false)}>
            <section className="info-card" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={(event) => event.stopPropagation()}>
              <button type="button" className="info-close" aria-label="Close game information" autoFocus onClick={() => setShowInfo(false)}>×</button>
              <h2 id="info-title">Talking Pearl</h2>
              <p>Talk and interact with your favorite person, Tom Pearl.</p>
              <p>Tap the green phone to call him and talk. Give him a drink or a snack, or tap the speaker to hear him say hi.</p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Mic, Phone, PhoneCall, RotateCcw, Sparkles } from 'lucide-react';
import laughImage from '@/assets/image.png';
import defaultImage from '@/assets/image copy.png';
import groanImage from '@/assets/image copy 2.png';
import noReactionImage from '@/assets/image copy 3.png';

type Reaction = 'default' | 'laugh' | 'groan' | 'silent';
type CallState = 'idle' | 'ringing' | 'connected';

const reactionImages: Record<Reaction, string> = {
  default: defaultImage,
  laugh: laughImage,
  groan: groanImage,
  silent: noReactionImage,
};

const reactionCopy: Record<Reaction, string> = {
  default: 'Pearl is waiting to hear you.',
  laugh: 'Pearl cracks up at what you said.',
  groan: 'Pearl lets out a big groan.',
  silent: 'Pearl stares right through you.',
};

function App() {
  const [reaction, setReaction] = useState<Reaction>('default');
  const [callState, setCallState] = useState<CallState>('idle');
  const [isReacting, setIsReacting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showReaction = (nextReaction: Reaction) => {
    setReaction(nextReaction);
    setIsReacting(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsReacting(false), 560);
  };

  const callPearl = () => {
    setCallState('ringing');
    setReaction('default');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCallState('connected'), 1100);
  };

  const hangUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCallState('idle');
    setReaction('default');
    setIsReacting(false);
  };

  const talkToPearl = () => {
    if (callState !== 'connected' || isReacting) return;
    const reactions: Reaction[] = ['laugh', 'groan', 'silent'];
    const nextReaction = reactions[Math.floor(Math.random() * reactions.length)];
    showReaction(nextReaction);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const status = callState === 'idle'
    ? reactionCopy[reaction]
    : callState === 'ringing'
      ? 'Pearl is picking up the phone...'
      : isReacting
        ? reactionCopy[reaction]
        : 'Pearl is listening. Say something.';

  return (
    <main className="app-shell">
      <section className={`game-screen ${callState}`} aria-label="Talking Pearl">
        <div className="pattern-wall" />
        <div className="wood-floor" />
        <div className="room-shadow" />

        <header className="game-header">
          <div className="game-title"><Sparkles size={13} /> TALKING PEARL</div>
          <button className="reset-button" type="button" aria-label="Reset call" onClick={hangUp}>
            <RotateCcw size={18} />
          </button>
        </header>

        <div className="picture-frame frame-left" />
        <div className="picture-frame frame-right" />
        <div className="side-table">
          <div className="lamp" />
          <div className="table-top" />
          <div className="table-leg table-leg-left" />
          <div className="table-leg table-leg-right" />
          <div className={`phone ${callState !== 'idle' ? 'phone-picked' : ''}`}>
            <div className="phone-handset"><i /><b /></div>
            <div className="phone-base"><div className="phone-dial"><span /><span /><span /><span /><span /><span /><span /><span /></div></div>
            <div className="phone-cord" />
          </div>
        </div>

        <div className="armchair">
          <div className="chair-back"><i /><i /><i /><i /><i /><i /></div>
          <div className="chair-seat" />
          <div className="chair-arm arm-left" />
          <div className="chair-arm arm-right" />
          <div className="chair-leg leg-left" />
          <div className="chair-leg leg-right" />
          <div className="chair-seam seam-left" />
          <div className="chair-seam seam-right" />
        </div>

        <div className={`pearl-wrap ${isReacting ? 'is-bouncing' : ''}`}>
          <div className="pearl-halo" />
          <img className="pearl" src={reactionImages[reaction]} alt="Pearl" onClick={talkToPearl} />
        </div>

        <div className="pearl-name">PEARL</div>
        <div className="status-pill" aria-live="polite"><span className={callState === 'connected' ? 'status-light live' : 'status-light'} />{status}</div>

        <div className="call-controls">
          {callState === 'idle' && (
            <button className="call-button" type="button" onClick={callPearl}><PhoneCall size={22} /><span>Call Pearl</span></button>
          )}
          {callState === 'ringing' && (
            <button className="call-button ringing-button" type="button" disabled><Phone size={22} /><span>Pearl is picking up...</span></button>
          )}
          {callState === 'connected' && (
            <div className="connected-controls">
              <button className={`talk-button ${isReacting ? 'talking' : ''}`} type="button" onClick={talkToPearl} disabled={isReacting}><Mic size={21} /><span>{isReacting ? 'Pearl is reacting...' : 'Tap to talk'}</span></button>
              <button className="hangup-button" type="button" aria-label="End call" onClick={hangUp}><Phone size={20} /></button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;

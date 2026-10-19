# Talking Pearl

Talk and interact with your favorite person, Tom Pearl.

A small toy built with React, TypeScript and Vite. Call Pearl, talk to him, and see how he reacts: he laughs, groans, says yes, or says no. Give him a drink or a snack, or tap the speaker to hear him say hi.

## Run it

```bash
npm install
npm run dev
```

Other scripts: `npm run build`, `npm run lint`, `npm run typecheck`.

## Project layout

- `src/App.tsx`: call state, reactions, and the scene markup
- `src/index.css`: all styling (room, portrait frame, phone, controls)
- `src/assets/pearl-*.png`: one image per reaction

## How a call works

Tap the green button to call Pearl. He picks up and listens through your microphone, so allow mic access when asked (it only works on `localhost` or HTTPS). When you stop talking, Pearl does a random reaction, then listens again. The call ends when you tap the red button, or when you stay quiet for about 7 seconds.

Pearl also has a hidden mood: laughs cheer him up, while "no" and gagging annoy him. If his mood gets too low, he hangs up on you. The numbers are at the top of `src/App.tsx`.

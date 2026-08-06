import type {Config} from 'tailwindcss';
// Passport palette. `clay` is remapped to a readable brass-ink so the many
// `text-clay` links across settings/edit/section components become the ochre
// accent; `paper`/`cream` become manila stock; `ink` becomes deep ink-navy.
export default {content:['./app/**/*.{ts,tsx,mdx}','./components/**/*.{ts,tsx}'],theme:{extend:{colors:{ink:'#16233B',navy:'#16233B',clay:'#8A6A24',brass:'#A97C2F',sage:'#4F6D57',coral:'#BE4133',paper:'#EBE3D2',cream:'#F6F0E2'},maxWidth:{content:'1100px'}}},plugins:[]} satisfies Config;

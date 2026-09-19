export type Theme = {
  id: string;
  name: string;
  background: string;
  gradient: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  radius: string;
};
export const themes: Theme[] = [
  {
    id: 'ngl-classic',
    name: 'NGL Classic',
    background: '#ff2d75',
    gradient: 'linear-gradient(135deg,#ff2d75,#ff7a00)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'neon-lime',
    name: 'Neon Lime',
    background: '#22e879',
    gradient: 'linear-gradient(135deg,#22e879,#c8ff00)',
    textColor: '#070a12',
    accentColor: '#070a12',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#101c3b)',
    textColor: '#fff',
    accentColor: '#00b8ff',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'royal',
    name: 'Royal',
    background: '#8b5cf6',
    gradient: 'linear-gradient(135deg,#8b5cf6,#ff2d75)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Space Grotesk',
    radius: '28px',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    background: '#00d9ff',
    gradient: 'linear-gradient(135deg,#00d9ff,#0066ff)',
    textColor: '#fff',
    accentColor: '#070a12',
    fontFamily: 'Inter',
    radius: '28px',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    background: '#ff7a00',
    gradient: 'linear-gradient(135deg,#ff7a00,#ff2d75)',
    textColor: '#fff',
    accentColor: '#fff',
    fontFamily: 'Poppins',
    radius: '28px',
  },
  {
    id: 'ggv-gold',
    name: 'GGV Gold',
    background: '#070a12',
    gradient: 'linear-gradient(135deg,#070a12,#6b4d00)',
    textColor: '#fff',
    accentColor: '#ffd54a',
    fontFamily: 'Space Grotesk',
    radius: '18px',
  },
  {
    id: 'campus-dark',
    name: 'Campus Dark',
    background: '#101522',
    gradient: 'linear-gradient(135deg,#101522,#243c5a)',
    textColor: '#fff',
    accentColor: '#00d9ff',
    fontFamily: 'Inter',
    radius: '18px',
  },
];

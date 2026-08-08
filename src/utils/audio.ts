/**
 * Native Web Audio API Sound Synthesizer for KasbiGo Notification Sounds.
 * This ensures beautiful, robust, and responsive sounds without relying on external network assets.
 */

export const playNotificationSound = (type: 'customer' | 'admin') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (type === 'customer') {
      // Ascending pleasant notification: C5 (523.25Hz) -> E5 (659.25Hz) -> G5 (783.99Hz)
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99];
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        
        gain.gain.setValueAtTime(0.15, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.35);
      });
    } else {
      // Admin chime: Double high "ding" with metallic crispness
      const now = ctx.currentTime;
      const chimes = [880.00, 1174.66]; // A5 -> D6
      
      chimes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        
        gain.gain.setValueAtTime(0.18, now + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.15 + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.45);
      });
    }
  } catch (error) {
    console.warn("Audio Context sound failed to play:", error);
  }
};

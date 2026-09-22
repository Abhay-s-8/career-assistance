/* ============================================================
   AURA — application entry
   Wires the stage, the avatar rig, the voice pipeline and the UI
   into a single frame loop.
   ============================================================ */

import './styles/tokens.css';
import './styles/app.css';

import { Stage } from './core/stage.js';
import { Avatar } from './core/avatar.js';
import { CameraRig } from './core/cameraRig.js';
import { ExpressionManager } from './core/expressions.js';
import { LipSync } from './core/lipsync.js';
import { MouthCavity } from './core/mouthCavity.js';
import { MODEL_URL, THEMES } from './core/config.js';

import { Speaker, ttsSupported } from './audio/tts.js';
import { SpeechInput, sttSupported } from './audio/stt.js';

import { LocalBrain } from './ai/localBrain.js';
import { RemoteBrain } from './ai/providers.js';
import { parseCommands } from './ai/commands.js';
import { ResumeDrawer } from './ui/resumeDrawer.js';
import { parseResumeFile, getSampleResume, loadSavedResume, saveResume, clearSavedResume } from './ai/resumeParser.js';
import { InterviewArena } from './ui/interviewArena.js';
import { CareerDiscoveryModal } from './ui/careerDiscoveryModal.js';
import { auth } from './core/auth.js';
import { AuthModal } from './ui/authModal.js';

import { $, $$, on, toast } from './ui/dom.js';
import { Shell } from './ui/shell.js';
import { ChatView } from './ui/chat.js';
import { FaceDrawer } from './ui/faceDrawer.js';
import { VoiceHud } from './ui/voiceHud.js';
import { SettingsModal, loadSettings, saveSettings } from './ui/settings.js';

/* ------------------------------------------------------------------ boot */

const settings = loadSettings();
const loaderFill = $('#loader-fill');
const loaderPct = $('#loader-pct');
const loaderStatus = $('#loader-status');

let shown = 0;
function progress(p, label) {
  if (label) loaderStatus.textContent = label;
  if (p < 0) return;                        // indeterminate chunk
  shown = Math.max(shown, Math.min(1, p));  // never runs backwards
  loaderFill.style.width = `${(shown * 100).toFixed(1)}%`;
  loaderPct.textContent = `${Math.round(shown * 100)}%`;
}

async function boot() {
  const canvas = $('#stage');

  progress(0.04, 'Booting neural stage…');
  const stage = new Stage(canvas);
  stage.setQuality(settings.quality);
  stage.setDustCount(settings.particles);
  stage.setFaceLight(settings.faceLight);
  stage.setExposure(settings.exposure);
  stage.applyTheme(settings.theme || 'studio');

  progress(0.1, 'Streaming avatar geometry…');
  let avatar;
  try {
    avatar = await Avatar.load(MODEL_URL, (p) => {
      if (p >= 0) progress(0.1 + p * 0.68, 'Streaming avatar geometry…');
      else progress(-1, 'Streaming avatar geometry…');
    });
  } catch (err) {
    console.error(err);
    loaderStatus.textContent = 'The avatar model could not be loaded.';
    loaderPct.textContent = '—';
    return;
  }

  progress(0.82, 'Indexing facial topology…');
  await frame();                              // let the bar paint
  stage.avatarRoot.add(avatar.root);
  stage.avatar = avatar;

  if (stage.chair) {
    progress(0.85, 'Positioning executive office studio…');
    stage.chair.load().then(() => {
      stage.chair.setVisible(settings.showChair !== false);
    }).catch((e) => console.warn('Chair load error:', e));
  }

  if (stage.room) {
    progress(0.88, 'Loading 3D executive studio room…');
    stage.room.load().then(() => {
      stage.room.setVisible(settings.showRoom !== false);
    }).catch((e) => console.warn('Room load error:', e));
  }

  progress(0.9, 'Calibrating camera…');
  const rig = new CameraRig(stage.camera, canvas);
  const faceY = (avatar && Number.isFinite(avatar.faceY)) ? avatar.faceY : 1.57;
  const headHalfD = (avatar?.face && Number.isFinite(avatar.face.headHalfD)) ? avatar.face.headHalfD : 0.10;
  const seamY = (avatar?.face && Number.isFinite(avatar.face.seamY)) ? avatar.face.seamY : 1.48;
  const lipUpperH = (avatar?.face && Number.isFinite(avatar.face.lipUpperH)) ? avatar.face.lipUpperH : 0.015;
  const lipZ = (avatar?.face && Number.isFinite(avatar.face.lipZ)) ? avatar.face.lipZ : 0.08;

  rig.calibrate(faceY);
  // The face lights belong on the measured face, not on a guess. A second,
  // tighter fill sits just below the mouth so the lip deformation actually
  // catches light instead of sitting in the chin's shadow.
  stage.faceLight.position.set(0, faceY + 0.02, headHalfD * 3 + 0.55);
  stage.mouthLight.position.set(0, seamY - lipUpperH * 1.5, lipZ + headHalfD * 1.15);
  stage.rimLight.target.position.set(0, faceY - 0.15, 0);
  stage.rimLight2.target.position.set(0, faceY - 0.15, 0);

  const expressions = new ExpressionManager(avatar);
  const lip = new LipSync();

  // A fused mesh has no mouth interior; once the seam is cut, this supplies
  // the dark cavity, teeth and tongue that the parted lips reveal.
  const cavity = new MouthCavity(avatar);

  progress(0.97, 'Warming the render pipeline…');
  expressions.update(0.016, 0, null);
  stage.render();
  await frame();

  /* ------------------------------------------------------------- voice */

  const speaker = new Speaker({
    ttsProvider: settings.ttsProvider || 'elevenlabs',
    elevenApiKey: settings.elevenApiKey,
    elevenVoiceId: settings.elevenVoiceId,
  });
  speaker.rate = settings.rate;
  speaker.pitch = settings.pitch;
  speaker.voiceURI = settings.voiceURI;
  speaker.setMuted(settings.muted);

  const mic = sttSupported ? new SpeechInput({ bars: 22 }) : null;

  /* --------------------------------------------------------------- UI */

  const chat = new ChatView();
  const voiceHud = new VoiceHud(22);

  async function playIntroDialog() {
    shell.openDrawer('chat');
    chat.system('Studio Demo →', 'Playing Intro Sequence with Lip-Sync & Animations');
    try {
      expressions.set('greeting');
      face.markPreset('greeting');
      avatar?.playAnimation('Standing_Greeting', 0.4, false);
      face.markMotion('Standing_Greeting');
      chat.add('bot', "Hey dear... How was your day?");

      const cue0 = await fetch('/audios/intro_0.json').then((r) => r.json()).catch(() => null);
      const audio0 = new Audio('/audios/intro_0.wav');
      if (cue0) lip.playCues(cue0);
      audio0.play().catch(() => {});
      await new Promise((r) => { audio0.onended = r; setTimeout(r, 2200); });

      expressions.set('sad');
      face.markPreset('sad');
      avatar?.playAnimation('Crying', 0.4);
      face.markMotion('Crying');
      chat.add('bot', "I missed you so much... Please don't go for so long!");

      const cue1 = await fetch('/audios/intro_1.json').then((r) => r.json()).catch(() => null);
      const audio1 = new Audio('/audios/intro_1.wav');
      if (cue1) lip.playCues(cue1);
      audio1.play().catch(() => {});
      await new Promise((r) => { audio1.onended = r; setTimeout(r, 3400); });

      expressions.set('neutral');
      face.markPreset('neutral');
      avatar?.playAnimation('Idle', 0.5);
      face.markMotion('Idle');
    } catch (err) {
      console.warn('Intro dialog error:', err);
    }
  }

  async function playApiWarningDialog() {
    shell.openDrawer('chat');
    chat.system('Studio Demo →', 'Playing API Warning Demo with Lip-Sync & Animations');
    try {
      expressions.set('angry');
      face.markPreset('angry');
      avatar?.playAnimation('Angry', 0.4);
      face.markMotion('Angry');
      chat.add('bot', "Please my dear, don't forget to add your API keys!");

      const cue0 = await fetch('/audios/api_0.json').then((r) => r.json()).catch(() => null);
      const audio0 = new Audio('/audios/api_0.wav');
      if (cue0) lip.playCues(cue0);
      audio0.play().catch(() => {});
      await new Promise((r) => { audio0.onended = r; setTimeout(r, 2900); });

      expressions.set('happy');
      face.markPreset('happy');
      avatar?.playAnimation('Laughing', 0.4);
      face.markMotion('Laughing');
      chat.add('bot', "You don't want to ruin Wawa Sensei with a crazy ChatGPT and ElevenLabs bill, right?");

      const cue1 = await fetch('/audios/api_1.json').then((r) => r.json()).catch(() => null);
      const audio1 = new Audio('/audios/api_1.wav');
      if (cue1) lip.playCues(cue1);
      audio1.play().catch(() => {});
      await new Promise((r) => { audio1.onended = r; setTimeout(r, 5500); });

      expressions.set('neutral');
      face.markPreset('neutral');
      avatar?.playAnimation('Idle', 0.5);
      face.markMotion('Idle');
    } catch (err) {
      console.warn('API warning error:', err);
    }
  }

  const face = new FaceDrawer(expressions, avatar, {
    onPlayIntro: playIntroDialog,
    onPlayApiWarning: playApiWarningDialog,
    onMotion: (m) => chat.system('3D Motion →', m),
  });
  face.report(avatar.report);

  const localBrain = new LocalBrain();
  let remoteBrain = new RemoteBrain(settings);

  let activeResume = loadSavedResume();
  if (activeResume) {
    localBrain.setResume(activeResume);
    remoteBrain.setResume(activeResume);
  }

  const initialUser = auth.getUser();
  if (initialUser) {
    localBrain.setUser(initialUser);
    remoteBrain.setUser(initialUser);
  }

  let waitingInterviewAfterResume = false;
  let chatInterviewSession = null;

  async function handleResumeUpload(file) {
    try {
      toast(`Analyzing ${file.name}…`);
      chat.system('Resume →', `Parsing ${file.name}…`);
      const parsed = await parseResumeFile(file);
      handleNewResume(parsed, waitingInterviewAfterResume);
      if (interviewArena.root?.classList.contains('is-open')) {
        interviewArena.track = 'resume';
        interviewArena.render();
      }
    } catch (err) {
      console.error(err);
      toast(err.message || 'Could not read resume.');
      chat.system('Resume Error →', err.message || 'Failed to read file');
    }
  }

  const interviewArena = new InterviewArena({
    speaker,
    lip,
    expressions,
    remoteBrain,
    resumeGetter: () => activeResume,
    onResumeUpload: handleResumeUpload,
    onSampleResume: () => handleNewResume(getSampleResume(), true)
  });

  const careerDiscoveryModal = new CareerDiscoveryModal({
    resumeGetter: () => activeResume,
    onLaunchInterview: (cfg) => interviewArena.open(cfg),
    onOpen: () => {
      shell.closeDrawer('chat');
      shell.closeDrawer('resume');
      shell.closeDrawer('face');
      $('#btn-career')?.classList.add('is-active');
      rig.apply('discovery');
      expressions.setDiscoveryMode(true);
    },
    onClose: () => {
      $('#btn-career')?.classList.remove('is-active');
      rig.apply('portrait');
      expressions.setDiscoveryMode(false);
    }
  });

  const shell = new Shell({
    onCamera: (name) => { shell.markCamera(rig.apply(name)); },
    onTheme: (name) => { shell.markTheme(stage.applyTheme(name)); settings.theme = name; saveSettings(settings); },
    onHologram: (v) => { shell.markHologram(stage.setHologram(v, avatar)); },
    onChair: (v) => {
      stage.chair?.setVisible(v);
      settings.showChair = v;
      saveSettings(settings);
      chat.system('Executive Chair →', v ? 'Visible on Stage' : 'Hidden');
    },
    onRoom: (v) => {
      stage.room?.setVisible(v);
      settings.showRoom = v;
      saveSettings(settings);
      chat.system('3D Room →', v ? 'Visible' : 'Hidden');
    },
    onMic: () => toggleMic(),
    onInterview: () => {
      if (careerDiscoveryModal.root?.classList.contains('is-open')) careerDiscoveryModal.close();
      interviewArena.open();
    },
    onCareerDiscovery: () => {
      if (careerDiscoveryModal.root?.classList.contains('is-open')) {
        careerDiscoveryModal.close();
      } else {
        careerDiscoveryModal.open();
      }
    },
    onDrawer: (name) => {
      if (name) {
        if (careerDiscoveryModal.root?.classList.contains('is-open')) careerDiscoveryModal.close();
        if (authModal?.isProfileOpen) authModal.closeProfile();
        if (authModal?.isOpen) authModal.close();
      }
    },
    onEscape: () => {
      if (careerDiscoveryModal.root?.classList.contains('is-open')) careerDiscoveryModal.close();
      else if (authModal?.isProfileOpen) authModal.closeProfile();
      else if (authModal?.isOpen) authModal.close();
      else if (interviewArena.root?.classList.contains('is-open')) interviewArena.close();
      else if (mic?.listening) mic.abort();
      else if (speaker.speaking) speaker.cancel();
    },
  });
  shell.markCamera('portrait');
  shell.markTheme(stage.themeName);
  shell.markChair(settings.showChair !== false);
  shell.markRoom(settings.showRoom !== false);

  const resumeDrawer = new ResumeDrawer({
    onUpload: handleResumeUpload,
    onSample: () => {
      const sample = getSampleResume();
      handleNewResume(sample, waitingInterviewAfterResume);
    },
    onClear: () => {
      clearSavedResume();
      activeResume = null;
      chatInterviewSession = null;
      localBrain.setResume(null);
      remoteBrain.setResume(null);
      shell.markResumeActive(false);
      resumeDrawer.setResume(null);
      toast('Resume profile removed.');
      chat.system('Resume →', 'Profile cleared');
    },
    onPrompt: (promptText) => {
      if (promptText.includes('mock interview') || promptText.includes('interview')) {
        interviewArena.open({ track: activeResume ? 'resume' : 'coding' });
        return;
      }
      shell.openDrawer('chat');
      send(promptText);
    },
    onCareerDiscovery: () => careerDiscoveryModal.open()
  });

  // Global hidden file input listener
  const fileInput = $('#resume-file-input');
  if (fileInput) {
    on(fileInput, 'change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleResumeUpload(file);
        fileInput.value = '';
      }
    });
  }

  function generateResumeQuestions(resume) {
    const topSkill = resume?.skills?.[0] || 'Modern Full-Stack Engineering';
    const secSkill = resume?.skills?.[1] || 'System Architecture';
    const thirdSkill = resume?.skills?.[2] || 'Cloud & Distributed Infrastructure';
    const role = resume?.headline || 'Senior Software Engineer';

    return [
      {
        questionNumber: 1,
        title: `Architectural Deep-Dive: ${topSkill}`,
        prompt: `In your resume, you highlighted strong production experience with ${topSkill} as a ${role}. Can you walk me through the most technically challenging problem you solved using ${topSkill}? Specifically, what architectural trade-offs did you make, how did you handle scale, and what were the edge cases?`,
        framework: 'Scale & latency benchmarks, technical ownership, system boundaries, and resilience.'
      },
      {
        questionNumber: 2,
        title: `Production Outage & Systems Reliability: ${secSkill}`,
        prompt: `Tell me about a time when a critical system or service relying on ${secSkill} failed or degraded significantly in production. How did you diagnose the root cause under pressure, mitigate the impact, and what permanent safeguards did you deploy?`,
        framework: 'STAR method (Situation, Task, Action, Result), observability, incident response, and regression prevention.'
      },
      {
        questionNumber: 3,
        title: `Technical Debt vs Shipping Velocity: ${thirdSkill}`,
        prompt: `When balancing rapid shipping velocity against long-term code quality and architectural health in ${thirdSkill}, how do you decide when to refactor? Can you share a concrete example from your past work?`,
        framework: 'Pragmatic engineering trade-offs, testing strategies, CI/CD automation, and team collaboration.'
      }
    ];
  }

  function askToUploadResumeFirst(context = 'interview') {
    shell.openDrawer('chat');
    const promptText = "Before I ask your interview questions, please upload your resume first! That way, I can review your actual projects, tech stack, and experience level to ask you questions tailored to your background.";
    chat.add('bot', promptText);
    chat.addUploadResumePrompt({
      onBrowse: () => {
        $('#resume-file-input')?.click();
      },
      onSample: () => {
        const sample = getSampleResume();
        handleNewResume(sample, true);
      },
      onDrawer: () => {
        shell.openDrawer('resume');
      },
      onSkip: () => {
        chat.system('Interview Track →', 'General Algorithmic Challenges');
        interviewArena.open({ track: 'coding' });
      }
    });

    if (!speaker.muted && ttsSupported) {
      expressions.set('talking');
      speaker.speak("Please upload your resume first so I can tailor the questions to your background!", lip).then(() => {
        expressions.set('neutral');
        face.markPreset('neutral');
      });
    }
  }

  function startChatInterview(resume) {
    shell.openDrawer('chat');
    chatInterviewSession = {
      active: true,
      resume,
      currentIndex: 0,
      questions: generateResumeQuestions(resume)
    };
    askNextChatQuestion();
  }

  function askNextChatQuestion() {
    if (!chatInterviewSession || !chatInterviewSession.active) return;
    const { questions, currentIndex, resume } = chatInterviewSession;
    if (currentIndex >= questions.length) {
      chatInterviewSession.active = false;
      const firstName = (resume.name && resume.name !== 'Candidate' ? resume.name : 'Candidate').split(' ')[0];
      const summaryMsg = `Excellent job completing this technical round, ${firstName}! You demonstrated strong problem-solving and architectural depth. Would you like to enter the Coding Arena to solve a live algorithm challenge now, or review your career discovery scorecard?`;
      chat.add('bot', summaryMsg);
      if (!speaker.muted && ttsSupported) {
        expressions.set('happy');
        speaker.speak(summaryMsg, lip).then(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
        });
      }
      return;
    }

    const q = questions[currentIndex];
    const firstName = (resume.name && resume.name !== 'Candidate' ? resume.name : 'Candidate').split(' ')[0];
    const speechIntro = currentIndex === 0
      ? `Great, let's begin your technical interview, ${firstName}. Here is Question 1: ${q.prompt}`
      : `Thank you. Now let's move to Question ${q.questionNumber}: ${q.prompt}`;

    chat.add('bot', currentIndex === 0
      ? `🎯 Technical Interview Round — Question 1 of ${questions.length}:`
      : `🎯 Next Question — Question ${q.questionNumber} of ${questions.length}:`
    );

    chat.addInterviewQuestionCard({
      questionNumber: q.questionNumber,
      totalQuestions: questions.length,
      title: q.title,
      prompt: q.prompt,
      framework: q.framework,
      onVoice: () => {
        toggleMic();
      },
      onArena: () => {
        interviewArena.open({ track: 'resume' });
      }
    });

    if (!speaker.muted && ttsSupported) {
      expressions.set('thinking');
      speaker.speak(speechIntro, lip).then(() => {
        expressions.set('neutral');
        face.markPreset('neutral');
      });
    }
  }

  function handleNewResume(resume, autoStartInterview = false) {
    activeResume = resume;
    saveResume(resume);
    localBrain.setResume(resume);
    remoteBrain.setResume(resume);
    shell.markResumeActive(true);
    resumeDrawer.setResume(resume);

    toast(`✓ Analyzed resume for ${resume.name}`);
    chat.system('Resume Analyzed →', `${resume.name} (${resume.headline || 'Profile'})`);

    chat.addResumeAnnouncement(resume, (prompt) => {
      send(prompt);
    });

    const firstName = (resume.name && resume.name !== 'Candidate' ? resume.name : 'Candidate').split(' ')[0];
    const topSkills = resume.skills?.slice(0, 3).join(', ') || 'modern engineering';

    if (autoStartInterview || waitingInterviewAfterResume) {
      waitingInterviewAfterResume = false;
      const spokenIntro = `Resume verified for ${firstName}! You bring strong experience in ${topSkills}. Let's jump straight into your interview round.`;
      chat.add('bot', spokenIntro);
      expressions.set('greeting');
      face.markPreset('greeting');
      avatar?.playAnimation('Standing_Greeting', 0.4, false);
      face.markMotion('Standing_Greeting');
      if (!speaker.muted && ttsSupported) {
        speaker.speak(spokenIntro, lip).finally(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
        });
      }
      setTimeout(() => {
        startChatInterview(resume);
      }, 400);
    } else {
      const spokenGreeting = `I have analyzed your resume, ${firstName}. You bring strong experience in ${topSkills}. Ready for your mock interview or resume critique?`;
      chat.add('bot', spokenGreeting);
      expressions.set('greeting');
      face.markPreset('greeting');
      avatar?.playAnimation('Standing_Greeting', 0.4, false);
      face.markMotion('Standing_Greeting');
      if (!speaker.muted && ttsSupported) {
        speaker.speak(spokenGreeting, lip).then(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
        });
      }
    }
  }

  resumeDrawer.setResume(activeResume);
  if (activeResume) {
    shell.markResumeActive(true);
  }

  const settingsModal = new SettingsModal(settings, (s, opts = {}) => {
    if (opts.livePreview) {
      stage.setFaceLight(s.faceLight);
      stage.setExposure(s.exposure);
      return;
    }
    speaker.rate = s.rate;
    speaker.pitch = s.pitch;
    speaker.voiceURI = s.voiceURI;
    speaker.ttsProvider = s.ttsProvider || 'elevenlabs';
    speaker.setElevenConfig({
      apiKey: s.elevenApiKey,
      voiceId: s.elevenVoiceId,
    });
    if (opts.test) {
      speaker.speak('Hello! I am Siya. My ElevenLabs neural voice and 3D facial animations are live.', lip);
      return;
    }
    stage.setFaceLight(s.faceLight);
    stage.setExposure(s.exposure);
    stage.setQuality(s.quality);
    stage.setDustCount(s.particles);
    remoteBrain = new RemoteBrain(s);
    if (activeResume) remoteBrain.setResume(activeResume);
    if (auth.getUser()) remoteBrain.setUser(auth.getUser());
    interviewArena.remoteBrain = remoteBrain;
    if (s.provider === 'openai' && !s.apiKey) toast('No OpenAI key entered — staying on the local engine.');
  });
  speaker.addEventListener('voices', (e) => settingsModal.setVoices(e.detail.voices));
  settingsModal.setVoices(speaker.voices);

  const modelChip = $('#model-chip');
  const modelLabel = $('#model-label');

  function updateModelBadge() {
    if (!modelLabel) return;
    if (remoteBrain && remoteBrain.configured) {
      const p = remoteBrain.provider;
      if (p === 'gemini') {
        const m = (remoteBrain.model || 'gemini-2.5-flash').replace('gemini-', '');
        modelLabel.textContent = `Gemini (${m})`;
        modelChip?.classList.add('is-connected');
        modelChip?.classList.remove('is-offline');
        if (modelChip) modelChip.title = `Connected to Google Gemini (${remoteBrain.model || 'gemini-2.5-flash'})`;
      } else {
        modelLabel.textContent = `OpenAI (${remoteBrain.model || 'gpt-4o-mini'})`;
        modelChip?.classList.add('is-connected');
        modelChip?.classList.remove('is-offline');
        if (modelChip) modelChip.title = `Connected to OpenAI (${remoteBrain.model || 'gpt-4o-mini'})`;
      }
    } else {
      modelLabel.textContent = 'Gemini (Local Mode)';
      modelChip?.classList.remove('is-connected');
      modelChip?.classList.add('is-offline');
      if (modelChip) modelChip.title = 'Click to configure Google Gemini API Key in Settings';
    }
  }

  if (modelChip) {
    on(modelChip, 'click', () => settingsModal.open());
  }
  updateModelBadge();

  /* --------------------------------------------------- authentication & personalization */

  const authGuestBtns = $('#auth-guest-btns');
  const btnTopbarSignin = $('#btn-topbar-signin');
  const btnTopbarSignup = $('#btn-topbar-signup');
  const btnTopbarUser = $('#btn-topbar-user');
  const topbarAvatarInitials = $('#topbar-avatar-initials');
  const topbarUserName = $('#topbar-user-name');

  function syncUserUI(user) {
    if (user) {
      if (authGuestBtns) authGuestBtns.hidden = true;
      if (btnTopbarUser) {
        btnTopbarUser.hidden = false;
        if (topbarAvatarInitials) topbarAvatarInitials.textContent = auth.getInitials();
        if (topbarUserName) topbarUserName.textContent = user.firstName || user.name.split(' ')[0];
        btnTopbarUser.title = `${user.name} (${user.targetRole || 'Software Professional'}) — View Profile`;
      }
    } else {
      if (authGuestBtns) authGuestBtns.hidden = false;
      if (btnTopbarUser) btnTopbarUser.hidden = true;
    }
  }

  const authModal = new AuthModal({
    onAuthSuccess: (user, type, attachedResume) => {
      syncUserUI(user);
      remoteBrain.setUser(user);
      localBrain.setUser(user);
      interviewArena.remoteBrain = remoteBrain;

      const firstName = user.firstName || user.name.split(' ')[0];

      if (attachedResume) {
        activeResume = attachedResume;
        saveResume(attachedResume);
        localBrain.setResume(attachedResume);
        remoteBrain.setResume(attachedResume);
        shell.markResumeActive(true);
        resumeDrawer.setResume(attachedResume);
        shell.openDrawer('chat');

        const targetRole = user.targetRole || attachedResume.headline || 'Software Professional';
        const topSkills = attachedResume.skills?.slice(0, 3).join(', ') || 'modern engineering';
        const skillCount = attachedResume.skills?.length || 0;

        const spokenGreeting = `Welcome to Siya, ${firstName}! I'm excited to work with you. I've analyzed your resume for ${targetRole} and detected ${skillCount} key skills, including ${topSkills}. What would you like to prepare for or explore first?`;

        chat.add('bot', spokenGreeting);
        expressions.set('greeting');
        face.markPreset('greeting');
        avatar?.playAnimation('Standing_Greeting', 0.4, false);
        face.markMotion('Standing_Greeting');

        chat.addRegistrationWelcomeCard({
          user,
          resume: attachedResume,
          onInterview: () => {
            startChatInterview(attachedResume);
          },
          onAtsCritique: () => {
            resumeDrawer.open();
            send('Please give me a thorough critique of my resume with 3 actionable improvements based on my ATS score.');
          },
          onJdPractice: () => {
            interviewArena.open({ track: 'jd' });
          },
          onDiscovery: () => {
            careerDiscoveryModal.open();
          },
          onVoice: () => {
            toggleMic();
          },
          onAction: (prompt) => send(prompt)
        });

        if (!speaker.muted && ttsSupported) {
          speaker.speak(spokenGreeting, lip).then(() => {
            expressions.set('neutral');
            face.markPreset('neutral');
            avatar?.playAnimation('Idle', 0.5);
            face.markMotion('Idle');
          });
        }
        return;
      }

      chat.addAuthAnnouncement(user, (prompt) => send(prompt));

      if (type === 'signup') {
        waitingInterviewAfterResume = true;
        expressions.set('greeting');
        face.markPreset('greeting');
        avatar?.playAnimation('Standing_Greeting', 0.4, false);
        face.markMotion('Standing_Greeting');
        askToUploadResumeFirst('signup');
      } else {
        const spokenGreeting = `Welcome back, ${firstName}! It's great to see you again. What are we preparing for today?`;
        chat.add('bot', spokenGreeting);
        expressions.set('greeting');
        face.markPreset('greeting');
        avatar?.playAnimation('Standing_Greeting', 0.4, false);
        face.markMotion('Standing_Greeting');
        if (!speaker.muted && ttsSupported) {
          speaker.speak(spokenGreeting, lip).then(() => {
            expressions.set('neutral');
            face.markPreset('neutral');
            avatar?.playAnimation('Idle', 0.5);
            face.markMotion('Idle');
          });
        }
      }
    },
    onSignOut: () => {
      syncUserUI(null);
      remoteBrain.setUser(null);
      localBrain.setUser(null);
      interviewArena.remoteBrain = remoteBrain;
      chat.system('Account →', 'Signed out. Guest session active.');
      const farewell = "You're signed out. Feel free to explore in guest mode or sign back in anytime!";
      chat.add('bot', farewell);
      if (!speaker.muted && ttsSupported) speaker.speak(farewell, lip);
    },
    onProfileUpdated: (user) => {
      syncUserUI(user);
      remoteBrain.setUser(user);
      localBrain.setUser(user);
      interviewArena.remoteBrain = remoteBrain;
      chat.system('Profile →', `Updated: ${user.name} (${user.targetRole || 'Software Professional'})`);
    }
  });

  if (btnTopbarSignin) on(btnTopbarSignin, 'click', () => authModal.open('signin'));
  if (btnTopbarSignup) on(btnTopbarSignup, 'click', () => authModal.open('signup'));
  if (btnTopbarUser) on(btnTopbarUser, 'click', () => authModal.toggleProfile());

  syncUserUI(auth.getUser());

  /* --------------------------------------------------- state plumbing */

  let generating = false;
  const setState = (s) => shell.setState(s);

  speaker.addEventListener('start', () => {
    setState('speaking');
  });

  speaker.addEventListener('end', () => {
    setState(mic?.listening ? 'listening' : 'idle');
    if (avatar && avatar.currentAnimation !== 'Idle') {
      avatar.playAnimation('Idle', 0.5);
      face.markMotion('Idle');
    }
  });

  // Chroma Key / Green Screen mode toggle
  const tglGreenscreen = $('#tgl-greenscreen');
  if (tglGreenscreen) {
    on(tglGreenscreen, 'change', (e) => {
      document.body.classList.toggle('greenScreen', e.target.checked);
      chat.system('Chroma Key →', e.target.checked ? 'Green Screen Background ON' : 'Standard 3D Stage');
    });
  }

  // Speech toggle
  const speakBtn = $('#btn-speak');
  on(speakBtn, 'click', () => {
    const muted = speaker.setMuted(!speaker.muted);
    settings.muted = muted;
    saveSettings(settings);
    speakBtn.classList.toggle('is-on', !muted);
    speakBtn.setAttribute('aria-pressed', String(!muted));
    speakBtn.title = muted ? 'Unmute speech' : 'Mute speech';
    speakBtn.querySelector('use').setAttribute('href', muted ? '#i-sound-off' : '#i-sound-on');
    if (!muted) {
      toast('🔊 Voice audio unmuted');
      if (!speaker.speaking) {
        speaker.speak('Voice audio is active.', lip).catch(() => {});
      }
    } else {
      toast('🔇 Voice audio muted');
    }
  });
  speakBtn.classList.toggle('is-on', !speaker.muted);
  speakBtn.title = speaker.muted ? 'Unmute speech' : 'Mute speech';
  speakBtn.setAttribute('aria-pressed', String(!speaker.muted));
  speakBtn.querySelector('use').setAttribute('href', speaker.muted ? '#i-sound-off' : '#i-sound-on');

  /* ------------------------------------------------------ scene actions */

  function runActions(actions) {
    for (const a of actions) {
      switch (a.kind) {
        case 'expression':
          expressions.set(a.value);
          face.markPreset(a.value);
          chat.system('Expression →', a.value);
          break;
        case 'camera':
          shell.markCamera(rig.apply(a.value));
          chat.system('Camera →', a.value === 'full' ? 'full body' : a.value);
          break;
        case 'theme':
          shell.markTheme(stage.applyTheme(a.value));
          settings.theme = a.value;
          saveSettings(settings);
          chat.system('Atmosphere →', THEMES[a.value]?.label || a.value);
          break;
        case 'hologram': {
          const now = stage.setHologram(!stage.hologramOn, avatar);
          shell.markHologram(now);
          chat.system('Hologram →', now ? 'on' : 'off');
          break;
        }
        case 'chair': {
          stage.chair?.setVisible(a.value);
          shell.markChair(a.value);
          settings.showChair = a.value;
          saveSettings(settings);
          chat.system('Executive Chair →', a.value ? 'Visible on Stage' : 'Hidden');
          break;
        }
        case 'room': {
          stage.room?.setVisible(a.value);
          shell.markRoom(a.value);
          settings.showRoom = a.value;
          saveSettings(settings);
          chat.system('3D Room →', a.value ? 'Visible on Stage' : 'Hidden');
          break;
        }
        case 'motion': {
          avatar?.playAnimation(a.value, 0.45, a.value === 'Standing_Greeting' ? false : true);
          face.markMotion(a.value);
          if (a.value === 'Standing_Greeting') {
            expressions.set('greeting');
            face.markPreset('greeting');
          }
          chat.system('3D Motion →', a.value);
          break;
        }
        default: break;
      }
    }
  }

  /* -------------------------------------------------------- conversation */

  async function send(text) {
    const rawMessage = String(text || '').trim();
    if (!rawMessage) return;

    if ($('#input')) $('#input').value = '';

    // Interrupt any active voice output immediately so Siya attends to new user input
    speaker.cancel();

    if (generating) return;

    // Clean leading emoji/punctuation for robust intent routing
    const message = rawMessage.replace(/^[\p{Emoji}\p{Punctuation}\s]+/gu, '').trim() || rawMessage;
    const userDisplayName = auth.getUser()?.name || null;

    if (/^(office )?chair|executive chair|put (the )?chair|toggle chair|show chair|hide chair|remove chair|place chair/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      const isHide = /hide|remove|disable|off/i.test(message);
      const isShow = /show|put|place|enable|on|add/i.test(message);
      const newState = isHide ? false : (isShow ? true : !stage.chair?.visible);
      stage.chair?.setVisible(newState);
      shell.markChair(newState);
      settings.showChair = newState;
      saveSettings(settings);
      
      const reply = newState
        ? "I've placed the 3D executive office chair on stage right next to me! How does the office studio look?"
        : "The executive office chair has been removed from the stage.";
      
      chat.system('Executive Chair →', newState ? 'Visible on Stage' : 'Hidden');
      chat.add('bot', reply);
      
      if (avatar) {
        avatar.playAnimation('Talking_1', 0.4);
        face.markMotion('Talking_1');
        expressions.set('happy');
        face.markPreset('happy');
      }
      
      if (!speaker.muted && ttsSupported) {
        speaker.speak(reply, lip).catch(() => {});
      }
      return;
    }

    if (/^(studio )?room|office room|put in room|inside room|toggle room|show room|hide room|remove room/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      const isHide = /hide|remove|disable|off/i.test(message);
      const isShow = /show|put|place|enable|on|add|inside/i.test(message);
      const newState = isHide ? false : (isShow ? true : !stage.room?.visible);
      stage.room?.setVisible(newState);
      shell.markRoom(newState);
      settings.showRoom = newState;
      saveSettings(settings);
      
      const reply = newState
        ? "I've positioned myself and the executive chair inside the 3D studio office room! How does the environment look?"
        : "The 3D studio room has been hidden from the stage.";
      
      chat.system('3D Room →', newState ? 'Visible on Stage' : 'Hidden');
      chat.add('bot', reply);
      
      if (avatar) {
        avatar.playAnimation('Talking_1', 0.4);
        face.markMotion('Talking_1');
        expressions.set('happy');
        face.markPreset('happy');
      }
      
      if (!speaker.muted && ttsSupported) {
        speaker.speak(reply, lip).catch(() => {});
      }
      return;
    }

    if (/camera (verification|access|verify)|give access of camera|grant camera|verify camera|webcam/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      chat.system('Camera Verification →', 'Launching Interview Arena & requesting camera access…');
      interviewArena.open({ track: activeResume ? 'resume' : 'coding' });
      await interviewArena.enableCamera();
      return;
    }

    if (/^(sign in|login|log in|create account|sign up|signup|register)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      chat.system('Authentication →', 'Opening Account Dialog');
      authModal.open(/sign in|login|log in/i.test(message) ? 'signin' : 'signup');
      return;
    }

    if (/^(my profile|user profile|account|show profile|who am i|whoami|profile)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      const cur = auth.getUser();
      if (cur) {
        chat.system('Profile →', `${cur.name} (${cur.targetRole || 'Software Professional'})`);
        authModal.openProfile();
      } else {
        chat.system('Profile →', 'Guest Session');
        authModal.open('signup');
      }
      return;
    }

    if (/^(sign out|logout|log out)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      if (auth.getUser()) {
        auth.signOut();
        authModal.closeProfile();
        toast('Signed out successfully.');
      } else {
        chat.add('bot', "You are already in guest mode!");
      }
      return;
    }

    if (/(focus (from |on )?(the )?waist|waist( up)? focus|focus (on )?(hand |hands )?gesture(s)?|show (hand )?gestures|zoom (to |out to )?waist|hand gesture focus|hand focus)/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      shell.markCamera(rig.apply('portrait'));
      chat.system('Camera Framing →', 'Waist-Up Focus (Hands & Facial Gestures Active)');
      avatar?.playAnimation('Talking_1', 0.4);
      face.markMotion('Talking_1');
      expressions.set('confident');
      face.markPreset('confident');
      const waistMsg = "Camera framed from the waist up! Hand gestures, posture, and facial expressions are now in full view and sharp focus.";
      chat.add('bot', waistMsg, null, { provider: 'Camera Rig' });
      if (!speaker.muted && ttsSupported) speaker.speak(waistMsg, lip).catch(() => {});
      return;
    }

    if (/^(dance|rumba|rumba dance|start dancing|dance for me)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      avatar?.playAnimation('Rumba', 0.4);
      face.markMotion('Rumba');
      expressions.set('happy');
      face.markPreset('happy');
      const danceMsg = "Look at these moves! Dancing always gets the energy and focus up!";
      chat.add('bot', danceMsg);
      if (!speaker.muted && ttsSupported) speaker.speak(danceMsg, lip).catch(() => {});
      return;
    }

    if (/^(laugh|tell (me )?a joke|funny|make me laugh)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      avatar?.playAnimation('Laughing', 0.4);
      face.markMotion('Laughing');
      expressions.set('funnyFace');
      face.markPreset('funnyFace');
      const laughMsg = "Haha! Why do programmers prefer dark mode? Because light attracts bugs!";
      chat.add('bot', laughMsg);
      if (!speaker.muted && ttsSupported) speaker.speak(laughMsg, lip).catch(() => {});
      return;
    }

    if (/^(cry|sad|why are you sad|crying)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      avatar?.playAnimation('Crying', 0.4);
      face.markMotion('Crying');
      expressions.set('sad');
      face.markPreset('sad');
      const sadMsg = "Aww... Don't worry, every failed test case is just one step closer to clean production code.";
      chat.add('bot', sadMsg);
      if (!speaker.muted && ttsSupported) speaker.speak(sadMsg, lip).catch(() => {});
      return;
    }

    if (/^(angry|mad|fight)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      avatar?.playAnimation('Angry', 0.4);
      face.markMotion('Angry');
      expressions.set('angry');
      face.markPreset('angry');
      const angryMsg = "Grr! When somebody pushes untested code straight into main branch on a Friday afternoon!";
      chat.add('bot', angryMsg);
      if (!speaker.muted && ttsSupported) speaker.speak(angryMsg, lip).catch(() => {});
      return;
    }

    if (/^(terrified|scared|ghost|fear)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      avatar?.playAnimation('Terrified', 0.4);
      face.markMotion('Terrified');
      expressions.set('surprised');
      face.markPreset('surprised');
      const fearMsg = "Oh no! A production database migration with zero backups? That is truly terrifying!";
      chat.add('bot', fearMsg);
      if (!speaker.muted && ttsSupported) speaker.speak(fearMsg, lip).catch(() => {});
      return;
    }

    if (/^(wink|wink left|wink right)$/i.test(message)) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      if (/right/i.test(message)) avatar?.triggerWinkRight?.(400);
      else avatar?.triggerWinkLeft?.(400);
      chat.add('bot', "😉 You got this! Confidence is half the interview.");
      return;
    }

    const isIntroReq = /^(introduce yourself|introduce|who are you|what is your name|who is siya|what is siya|who is akshay|what is akshay|tell me about yourself|about yourself|start intro|start introduction|give your introduction|siya intro|your intro|intro|welcome)$/i.test(message)
      || /(introduce yourself|tell me about yourself|give (me )?(your )?introduction|speak your intro|what is your role|who are you)/i.test(message);

    if (isIntroReq) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      expressions.set('greeting');
      face.markPreset('greeting');
      avatar?.playAnimation('Standing_Greeting', 0.4, false);
      face.markMotion('Standing_Greeting');
      const cur = auth.getUser();
      const userFirstName = cur?.firstName || (cur?.name ? cur.name.split(' ')[0] : null);
      const introText = userFirstName
        ? `Welcome, ${userFirstName}! I am Siya — your 3D AI companion and engineering career mentor powered by Google Gemini. I combine real-time 3D facial expressions, ElevenLabs neural voice synthesis, and deep Gemini intelligence. I'm here to run mock interview rounds, analyze your resume with ATS scoring, and guide your software career growth. What would you like to prepare for today?`
        : `Hello! I am Siya — your 3D AI companion and engineering career mentor powered by Google Gemini. Equipped with real-time 3D facial expressions, ElevenLabs neural voice synthesis, and deep Gemini intelligence, I specialize in conducting mock technical interviews, reviewing resumes with ATS diagnostics, and guiding your career roadmap. Feel free to speak with your voice or type in the chat below!`;
      
      chat.addSiyaIntroductionCard({
        user: cur,
        onAction: (prompt) => send(prompt),
        onSpeakIntro: () => {
          speaker.cancel();
          expressions.set('greeting');
          face.markPreset('greeting');
          avatar?.playAnimation('Standing_Greeting', 0.4, false);
          face.markMotion('Standing_Greeting');
          const t0 = performance.now();
          const doneGreeting = () => {
            const rem = Math.max(0, 4200 - (performance.now() - t0));
            setTimeout(() => {
              expressions.set('neutral');
              face.markPreset('neutral');
              avatar?.playAnimation('Idle', 0.5);
              face.markMotion('Idle');
            }, rem);
          };
          if (!speaker.muted && ttsSupported) {
            speaker.speak(introText, lip).finally(() => {
              doneGreeting();
            });
          } else {
            doneGreeting();
          }
        },
        onVoice: () => toggleMic(),
        onResumeDrawer: () => shell.openDrawer('resume'),
        onInterview: () => {
          if (activeResume) {
            interviewArena.open();
          } else {
            askToUploadResumeFirst('interview');
          }
        }
      });

      const startTime = performance.now();
      const finishGreeting = () => {
        const remaining = Math.max(0, 4000 - (performance.now() - startTime));
        setTimeout(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
        }, remaining);
      };

      if (!speaker.muted && ttsSupported) {
        speaker.speak(introText, lip).catch(() => {}).finally(() => {
          finishGreeting();
        });
      } else {
        finishGreeting();
      }
      return;
    }

    const isWaveReq = /^(hi\s+gesture|wave|wave\s+hand|wave\s+at\s+me|wave\s+to\s+me|do\s+a\s+wave|give\s+a\s+wave|say\s+hi|say\s+hello|give\s+greeting|greeting\s+gesture|wave\s+gesture|do\s+hi\s+gesture|gesture\s+hi|can\s+you\s+wave|can\s+you\s+say\s+hi|greet\s+me|show\s+hi\s+gesture|hand\s+wave|wave\s+hello)(!|\.|\?)?$/i.test(message)
      || /(wave (your )?hand|give (a |me a )?wave|do (a |the )?wave|hi gesture|wave gesture|gesture (a )?greeting|greet me|wave to me)/i.test(message);

    const isGreetingReq = isWaveReq
      || /^(hi|hello|hey|heya|yo|howdy|greetings|good (morning|afternoon|evening|day)|hi siya|hello siya|hey siya|namaste|sup)(!|\.|\?)?$/i.test(message)
      || /^(hi|hello|hey)\s+(there|siya|friend|companion|bot|avatar|buddy)(!|\.|\?)?$/i.test(message)
      || /^(hi|hello|hey|greetings|namaste)\b/i.test(message)
      || /(greeting expression|greet expression|greeting face|welcome face|hi expression|hi face|say hi|hi greeting)/i.test(message);

    if (isGreetingReq) {
      if ($('#input')) $('#input').value = '';
      chat.add('user', rawMessage, userDisplayName);
      expressions.set('greeting');
      face.markPreset('greeting');
      avatar?.playAnimation('Standing_Greeting', 0.4, false);
      face.markMotion('Standing_Greeting');
      
      const cur = auth.getUser();
      const userFirstName = cur?.firstName || (cur?.name ? cur.name.split(' ')[0] : null);
      const isExplicitWave = isWaveReq || /(wave|gesture)/i.test(message);
      const greetingText = isExplicitWave
        ? (userFirstName ? `*Waves warmly* Hello, ${userFirstName}! It's great to see you. Ready to practice technical interviews, explore system architecture, or review your resume?` : `*Waves warmly* Hello! I am Siya — your 3D AI companion and engineering career mentor. How can I help you today? Feel free to ask technical questions, practice mock interviews, or upload your resume!`)
        : (userFirstName
          ? `Hello, ${userFirstName}! Great to see you. I am Siya, your 3D AI companion and engineering career mentor. What would you like to prepare for today? We can practice a mock interview, review your resume with ATS scoring, or explore system architecture!`
          : `Hello! I am Siya — your 3D AI companion and engineering career mentor powered by Google Gemini. How can I help you today? Feel free to ask me technical interview questions, upload your resume for ATS scoring, or explore live coding challenges!`);
      
      const providerLabel = remoteBrain.configured ? `Google Gemini (${(remoteBrain.model || 'gemini-2.5-flash').replace('gemini-', '')})` : 'Google Gemini AI';
      chat.add('bot', greetingText, null, { provider: providerLabel });
      
      const startTime = performance.now();
      const finishGreeting = () => {
        const remaining = Math.max(0, 4000 - (performance.now() - startTime));
        setTimeout(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
        }, remaining);
      };

      if (!speaker.muted && ttsSupported) {
        speaker.speak(greetingText.replace(/^\*.*?\*\s*/, ''), lip).catch(() => {}).finally(() => {
          finishGreeting();
        });
      } else {
        finishGreeting();
      }
      return;
    }

    if (/(formal (action|mode|voice|tone|cadence)|executive (mode|tone|voice)|elevenlab(s)? (formal|action|voice|test)|take formal action)/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      chat.system('ElevenLabs Neural Voice →', 'Formal Executive Mode Active');
      expressions.set('confident');
      face.markPreset('confident');
      avatar?.playAnimation('Talking_2', 0.4);
      face.markMotion('Talking_2');
      const formalMsg = "Formal executive mode engaged. My ElevenLabs neural voice pipeline is operating with high acoustic stability, pristine clarity, and a poised delivery tailored for senior technical interviews and leadership reviews. How shall we proceed?";
      chat.add('bot', formalMsg);
      if (!speaker.muted && ttsSupported) {
        speaker.speak(formalMsg, lip).catch(() => {}).finally(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
        });
      }
      return;
    }

    if (/^(play intro|intro dialogue|demo dialogue|intro demo)$/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      playIntroDialog();
      return;
    }

    if (/^(play api warning|api warning demo|wawa sensei)$/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      playApiWarningDialog();
      return;
    }

    if (/(new|clean|cleaner) (facial )?expression/i.test(message) || /this (is )?(the )?new facial expression/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      chat.system('Expression Engine →', 'Refined Clean Presets Applied');
      expressions.set('happy');
      face.markPreset('happy');
      const responseText = "I've refined the facial expression engine with a cleaner, natural balance. Mouth curvature, eyelid squints, and vertex displacements are now smooth, organic, and free of geometric distortion.";
      chat.add('bot', responseText);
      if (speaker && !speaker.muted) speaker.speak(responseText, lip).catch(() => {});
      return;
    }

    // Direct in-chat API key detection (e.g. Gemini AIzaSy... or OpenAI sk-...)
    const geminiKeyMatch = rawMessage.match(/(AIzaSy[A-Za-z0-9_-]{30,})/);
    const openAiKeyMatch = rawMessage.match(/(sk-[A-Za-z0-9_-]{20,})/);

    if (geminiKeyMatch || openAiKeyMatch) {
      const isGemini = !!geminiKeyMatch;
      const key = isGemini ? geminiKeyMatch[1] : openAiKeyMatch[1];
      settings.provider = isGemini ? 'gemini' : 'openai';
      settings.apiKey = key;
      settings.model = isGemini ? 'gemini-2.5-flash' : 'gpt-4o-mini';
      saveSettings(settings);

      remoteBrain = new RemoteBrain(settings);
      if (activeResume) remoteBrain.setResume(activeResume);
      if (auth.getUser()) remoteBrain.setUser(auth.getUser());
      interviewArena.remoteBrain = remoteBrain;
      updateModelBadge();

      chat.add('user', '•••••••••••••••••••••••••••••••• (API Key provided)', userDisplayName);
      const confirmMsg = `✓ Successfully connected to ${isGemini ? 'Google Gemini (gemini-2.5-flash)' : 'OpenAI (gpt-4o-mini)'}! My vocabulary and deep reasoning are now fully unlocked. Ask me anything!`;
      chat.add('bot', confirmMsg);
      toast(`✓ ${isGemini ? 'Gemini' : 'OpenAI'} API Key connected & saved!`);
      if (speaker && !speaker.muted) speaker.speak(confirmMsg, lip).catch(() => {});
      return;
    }

    if (/(did you connect|are you connected|is gemini connected|connected to gemini|check gemini|gemini status|which model|what model|are you gemini)/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      const isConnected = remoteBrain.configured;
      const modelName = settings.model || 'gemini-2.5-flash';
      const statusText = isConnected
        ? `Yes! I am connected to Google Gemini (${modelName}). My vocabulary, deep reasoning, coding evaluation, and mock interview simulation are fully active.`
        : "I am currently running on my local offline engine. You can connect Google Gemini anytime by pasting your API key directly in this chat or opening Settings!";
      chat.system('AI Engine Status →', isConnected ? `Google Gemini (${modelName}) Active` : 'Offline Engine');
      chat.add('bot', statusText);
      updateModelBadge();
      if (speaker && !speaker.muted) speaker.speak(statusText, lip).catch(() => {});
      return;
    }

    if (/^(connect|add|setup|use|configure) (gemini|openai|api key|model|ai)|^how to connect( gemini)?$|^(open )?settings$/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      chat.system('Settings Modal →', 'Opened API Configuration');
      settingsModal.open();
      const helpMsg = "I've opened the Settings dialog. Google Gemini is already pre-configured and securely connected via the backend engine. You can also configure OpenAI, voice parameters, or render quality here.";
      chat.add('bot', helpMsg);
      if (speaker && !speaker.muted) speaker.speak(helpMsg, lip).catch(() => {});
      return;
    }

    if (/(jd|job posting|job description|role specific|tailored interview|company specific|speech diagnostic)/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      chat.system('JD Interview Simulator →', 'Targeted Job Posting Drill & Speech Diagnostic Opened');
      interviewArena.open({ track: 'jd' });
      return;
    }

    // Active chat interview round answer handler
    if (chatInterviewSession && chatInterviewSession.active) {
      if (/^(quit|stop|exit|cancel|end|stop interview|pause|pause interview|close interview|abort)$/i.test(message)) {
        chat.add('user', rawMessage, userDisplayName);
        chatInterviewSession.active = false;
        chat.system('Interview Session →', 'Paused');
        const pauseReply = "Technical interview paused! We can resume your interview round whenever you're ready. What would you like to explore next?";
        chat.add('bot', pauseReply);
        if (!speaker.muted && ttsSupported) speaker.speak(pauseReply, lip).catch(() => {});
        return;
      }

      chat.add('user', rawMessage, userDisplayName);
      setState('thinking');
      chat.typing(true);
      if (expressions.preset !== 'custom') expressions.flash('thinking', 1400);

      const currentQ = chatInterviewSession.questions[chatInterviewSession.currentIndex];
      const evalPrompt = `You are Siya, an empathetic but rigorous Senior Staff / FAANG engineering interviewer.
The candidate is answering:
Question: "${currentQ.prompt}"
Evaluation rubric: "${currentQ.framework}"
Candidate Answer: "${rawMessage}"

Respond directly to the candidate in 2-3 sentences:
1. Praise what they did well (e.g. good architectural intuition, clear explanation, metrics).
2. Point out 1 nuance, edge case, or system scaling factor they could mention to elevate their answer to Staff level.
Keep it conversational, inspiring, and concise.`;

      let feedback;
      try {
        feedback = remoteBrain.configured
          ? await remoteBrain.reply(evalPrompt)
          : await localBrain.reply(evalPrompt);
      } catch (err) {
        feedback = "Great answer! You covered the core principles well and demonstrated solid engineering judgement.";
      } finally {
        chat.typing(false);
      }

      chat.add('bot', feedback);
      if (!speaker.muted && ttsSupported) {
        expressions.set('happy');
        speaker.speak(feedback, lip).catch(() => {}).finally(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
          chatInterviewSession.currentIndex++;
          askNextChatQuestion();
        });
      } else {
        chatInterviewSession.currentIndex++;
        askNextChatQuestion();
      }
      return;
    }

    const isInterviewReq = /^(open |start |launch |do |take |conduct |practice )?(a )?(mock )?interview( arena)?$|^interview me$|^(ask|give)( me)? (a |some )?(technical )?(interview )?questions?$|^ask qustion$|^ask question$|^coding interview$|^practice interview$|^quiz me$|^test me$/i.test(message)
      || /(interview me|take my interview|ask me questions|ask me an interview question|ask me a question|ask question|ask qustion|upload resume and then ask|upload resume & start interview|first ask to upload)/i.test(message);

    if (isInterviewReq) {
      chat.add('user', rawMessage, userDisplayName);
      if (!activeResume) {
        chat.system('Interview Gate →', 'Resume Required First');
        waitingInterviewAfterResume = true;
        askToUploadResumeFirst('interview');
        return;
      }
      chat.system('Interview Session →', `Starting Technical Round for ${activeResume.name}`);
      startChatInterview(activeResume);
      return;
    }

    if (/^(open |start |launch )?(career|discovery|career discovery( questionnaire| studio)?)$/i.test(message) || /career discovery/i.test(message) || /^questionnaire$/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      chat.system('Career Discovery Studio →', '8-Stage Questionnaire Opened');
      careerDiscoveryModal.open();
      return;
    }

    if (/^(inspect |check )(all |every )?skills?$|^inspect skills?$/i.test(message)) {
      chat.add('user', rawMessage, userDisplayName);
      if (!activeResume) {
        chat.system('Skill Inspector →', 'Loading Sample Resume Profile');
        handleNewResume(getSampleResume());
      }
      shell.openDrawer('resume');
      resumeDrawer._showSkillInspectorModal();
      return;
    }

    // General conversational query path
    generating = true;
    chat.add('user', rawMessage, userDisplayName);

    try {
      const cmd = parseCommands(message);
      if (cmd.actions.length) runActions(cmd.actions);

      let reply;
      let providerLabel = 'Google Gemini';

      if (cmd.exhausted) {
        reply = cmd.say;
        providerLabel = '3D Stage Action';
      } else {
        const promptReaction = analyzeReaction(rawMessage, '');
        setState('thinking');
        expressions.set(promptReaction.expression);
        face.markPreset(promptReaction.expression);
        avatar?.playAnimation(promptReaction.animation, 0.45);
        face.markMotion(promptReaction.animation);
        chat.typing(true);

        const isGeminiActive = remoteBrain.configured && remoteBrain.provider === 'gemini';
        providerLabel = isGeminiActive
          ? `Google Gemini (${(remoteBrain.model || 'gemini-2.5-flash').replace('gemini-', '')})`
          : (remoteBrain.configured ? `OpenAI (${remoteBrain.model || 'gpt-4o-mini'})` : 'Google Gemini AI');

        try {
          reply = remoteBrain.configured
            ? await remoteBrain.reply(message)
            : await localBrain.reply(message);
        } catch (err) {
          console.warn('[AURA] remote engine failed, falling back to local brain', err);
          reply = await localBrain.reply(message);
        } finally {
          chat.typing(false);
        }
        if (cmd.say) reply = `${cmd.say} ${reply}`;
      }

      chat.add('bot', reply, null, { provider: providerLabel });

      const reaction = analyzeReaction(rawMessage, reply);
      expressions.set(reaction.expression);
      face.markPreset(reaction.expression);
      avatar?.playAnimation(reaction.animation, reaction.speed);
      face.markMotion(reaction.animation);

      if (!speaker.muted && ttsSupported) {
        speaker.speak(reply, lip).then(() => {
          expressions.set('neutral');
          face.markPreset('neutral');
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
          setState('idle');
        }).catch(() => {
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
          expressions.set('neutral');
          face.markPreset('neutral');
          setState('idle');
        });
      } else {
        setTimeout(() => {
          avatar?.playAnimation('Idle', 0.5);
          face.markMotion('Idle');
          expressions.set('neutral');
          face.markPreset('neutral');
          setState('idle');
        }, Math.min(5500, Math.max(2200, reply.length * 45)));
      }
    } finally {
      generating = false;
    }
  }

  /**
   * Intelligently classifies the emotional tone and context of the chat turn
   * to drive Siya's 3D facial expressions, skeletal gestures, and posture dynamically.
   */
  function analyzeReaction(userPrompt = '', botReply = '') {
    const p = (userPrompt || '').toLowerCase();
    const r = (botReply || '').toLowerCase();
    const combined = `${p} ${r}`;

    // 0. Greeting, Introduction & Welcome
    if (/greeting|introduce|welcome|hello|hi\b|hey\b|wave|hi gesture|gesture|who are you|what is your name|tell me about yourself|namaste|heya|howdy|good morning|good afternoon|good evening/i.test(p)
      || /welcome|hello|hi\b|hey\b|namaste|i am siya|glad to meet|\*waves|how can i help/i.test(r)) {
      return {
        tone: 'greeting',
        expression: 'greeting',
        animation: 'Standing_Greeting',
        speed: 0.4
      };
    }

    // 1. Victory, Dance & Celebration
    if (/dance|rumba|party|celebrat|victory|congratulation|woohoo|hurray|yay|nailed it|got the offer|got the job|i got hired|passed the interview/i.test(p)
      || /celebrat|congratulations|congrats|woohoo|hurray|fantastic achievement|welcome aboard|cheers/i.test(r)) {
      return {
        tone: 'happy',
        expression: 'happy',
        animation: /dance|rumba/i.test(p) ? 'Rumba' : 'Talking_1',
        speed: 0.4
      };
    }

    // 2. Humor & Laughter
    if (/joke|funny|hilarious|make me laugh|tell a joke|haha|lmao|rofl/i.test(p)
      || /haha|hehe|joke|funny|laugh|chuckle|punchline/i.test(r)) {
      return {
        tone: 'happy',
        expression: 'funnyFace',
        animation: 'Laughing',
        speed: 0.4
      };
    }

    // 3. High Joy, Gratitude, Delight & Welcome
    if (/thank|thanks|great job|amazing|awesome|love|delight|wonderful|brilliant|helpful|bless/i.test(p)
      || /delight|love|great|excellent|happily|pleasure|thank you|welcome|happy|excited|awesome|fantastic|wonderful|marvelous|glad to help|thrilled/i.test(r)) {
      return {
        tone: 'happy',
        expression: 'happy',
        animation: 'Talking_1',
        speed: 0.4
      };
    }

    // 4. Strategic Leadership, Senior/Staff, Executive & Formal Authority
    if (/formal|executive|leadership|strategy|senior|staff|principal|director|lead|production scale|system design|architect/i.test(p)
      || /leadership|senior|staff|architect|production|scale|expert|mastery|achieve|strategic|governance|high-throughput|resilience/i.test(r)) {
      return {
        tone: 'confident',
        expression: 'confident',
        animation: 'Talking_2',
        speed: 0.4
      };
    }

    // 5. Deep Technical Inquiry, Architecture & Problem Solving
    if (/\?$|how to|why|explain|analyze|architecture|tradeoff|database|distributed|algorithm|complexity|kafka|microservice|kubernetes|redis|sql|nosql|optimize/i.test(p)
      || /analyz|architecture|evaluate|tradeoff|diagnos|consider|mechanism|under the hood|algorithm|pattern|throughput|latency/i.test(r)) {
      return {
        tone: 'thinking',
        expression: 'thinking',
        animation: 'Talking_0',
        speed: 0.45
      };
    }

    // 6. Surprise, Shock, Critical Incidents & Alerts
    if (/wow|astonish|surpris|really\?|no way|omg|unbelievable|incident|outage|crash|security breach|vulnerability|data loss/i.test(combined)) {
      return {
        tone: 'surprised',
        expression: 'surprised',
        animation: /incident|outage|crash|breach|loss/i.test(combined) ? 'Terrified' : 'Talking_0',
        speed: 0.4
      };
    }

    // 7. Sadness, Rejection, Struggle, Bugs & Empathy
    if (/sad|rejected|fail|lost|unfortunate|sorry|struggling|depressed|nervous|anxious|frustrat|stuck|hard time|bug|defect/i.test(combined)) {
      return {
        tone: 'sad',
        expression: 'sad',
        animation: 'Talking_0',
        speed: 0.4
      };
    }

    // 8. Assertiveness, Challenge & Debate
    if (/angry|mad|fight|strict|refuse|disagree|never|demand|strict/i.test(combined)) {
      return {
        tone: 'angry',
        expression: 'angry',
        animation: 'Angry',
        speed: 0.4
      };
    }

    // 9. Standard Conversational Flow
    return {
      tone: 'talking',
      expression: 'smile',
      animation: 'Talking_1',
      speed: 0.4
    };
  }

  const composerForm = $('#composer');
  if (composerForm) {
    on(composerForm, 'submit', (e) => {
      e.preventDefault();
      const inputEl = $('#input');
      if (inputEl && inputEl.value.trim()) {
        send(inputEl.value.trim());
      }
    });
  }

  const sendBtn = $('#btn-send');
  if (sendBtn) {
    on(sendBtn, 'click', (e) => {
      e.preventDefault();
      const inputEl = $('#input');
      if (inputEl && inputEl.value.trim()) {
        send(inputEl.value.trim());
      }
    });
  }

  const suggestionsEl = $('#suggestions');
  if (suggestionsEl) {
    // 1. Mouse wheel horizontal scrolling
    suggestionsEl.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        suggestionsEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    // 2. Click & drag to scroll
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    suggestionsEl.addEventListener('mousedown', (e) => {
      isDown = true;
      hasMoved = false;
      startX = e.pageX - suggestionsEl.offsetLeft;
      scrollLeft = suggestionsEl.scrollLeft;
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        suggestionsEl.classList.remove('is-dragging');
        setTimeout(() => { hasMoved = false; }, 80);
      }
    });

    suggestionsEl.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - suggestionsEl.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 10) {
        hasMoved = true;
        suggestionsEl.classList.add('is-dragging');
        suggestionsEl.scrollLeft = scrollLeft - walk;
      }
    });

    // 3. Chip click
    for (const b of $$('#suggestions .chipbtn')) {
      on(b, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (hasMoved) return;
        const text = b.textContent.trim();
        if (text) send(text);
      });
    }
  } else {
    for (const b of $$('#suggestions .chipbtn')) {
      on(b, 'click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const text = b.textContent.trim();
        if (text) send(text);
      });
    }
  }

  /* --------------------------------------------------------------- mic */

  function toggleMic() {
    if (!mic) { toast('This browser has no speech recognition — Chrome or Edge will work.'); return; }
    if (mic.listening) mic.stop('user');
    else {
      speaker.cancel();
      mic.start();
    }
  }
  on($('#btn-mic'), 'click', toggleMic);
  on($('#voice-done'), 'click', () => mic?.stop('user'));
  on($('#voice-cancel'), 'click', () => mic?.abort());

  if (mic) {
    mic.addEventListener('start', () => {
      setState('listening');
      voiceHud.open();
      $('#btn-mic').classList.add('is-live');
    });
    mic.addEventListener('text', (e) => voiceHud.set(e.detail.final, e.detail.interim));
    mic.addEventListener('level', (e) => {
      voiceHud.levels(e.detail.levels);
      // Mirror the user's own loudness on the avatar's face — it reads as
      // active listening rather than a frozen stare.
      expressions.setListening(e.detail.rms);
    });
    mic.addEventListener('error', (e) => {
      voiceHud.close();
      $('#btn-mic').classList.remove('is-live');
      setState('idle');
      toast(e.detail.message);
    });
    mic.addEventListener('end', (e) => {
      voiceHud.close();
      $('#btn-mic').classList.remove('is-live');
      setState('idle');
      const text = e.detail.text;
      if (text && e.detail.reason !== 'cancel') {
        $('#input').value = text;
        send(text);
      }
    });
  }

  /* ------------------------------------------------------------- frame */

  let last = performance.now();
  let acc = 0, frames = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const elapsed = now / 1000;

    avatar?.update(dt);
    const lipOut = lip.update(dt);
    expressions.update(dt, elapsed, lipOut);
    cavity.update();
    rig.update(dt);
    rig.breathe(elapsed, rig.current === 'portrait' ? 1 : 0.4);
    stage.update(dt, elapsed);
    stage.render();

    if (shell.isOpen('face')) face.sync();

    // Auto-drop quality if the device is clearly struggling.
    acc += dt; frames++;
    if (acc >= 4) {
      const fps = frames / acc;
      if (fps < 26 && stage.quality > 1) {
        stage.setQuality(stage.quality - 1);
        toast('Lowered render quality to keep things smooth.');
      }
      acc = 0; frames = 0;
    }
  }

  /* -------------------------------------------------------------- reveal */


  progress(1, 'Ready');
  await frame();
  $('#loader').classList.add('is-done');
  const app = $('#app');
  app.classList.add('is-ready');
  app.setAttribute('aria-hidden', 'false');
  setTimeout(() => $('#loader')?.remove(), 900);

  requestAnimationFrame(tick);

  if (avatar) {
    avatar.onOneShotFinished = () => 'Idle';
    avatar.onAnimationAutoTransition = (anim) => face.markMotion(anim);
  }

  const curUser = auth.getUser();
  const firstName = curUser?.firstName || (curUser?.name ? curUser.name.split(' ')[0] : null);

  const spokenIntro = firstName
    ? `Welcome back, ${firstName}! I am Siya, your 3D AI companion and engineering career mentor. I'm ready to conduct mock technical interviews, review your resume with ATS scoring, or explore system architecture. What would you like to prepare for today?`
    : `Hello! I am Siya — your 3D AI companion and engineering career mentor. I'm ready to conduct mock technical interviews, review your resume with ATS scoring, or explore system architecture. Feel free to speak with your voice or type in the chat below. How can I help you today?`;

  let introHasSpoken = false;
  const playIntroSpeech = () => {
    introHasSpoken = true;
    expressions.set('greeting');
    face.markPreset('greeting');
    avatar?.playAnimation('Standing_Greeting', 0.4, false);
    face.markMotion('Standing_Greeting');

    const minGreetingDuration = 4200;
    const startTime = performance.now();

    const finishGreeting = () => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, minGreetingDuration - elapsed);
      setTimeout(() => {
        expressions.set('neutral');
        face.markPreset('neutral');
        avatar?.playAnimation('Idle', 0.5);
        face.markMotion('Idle');
        setState('idle');
      }, remaining);
    };

    if (speaker.muted || !ttsSupported) {
      finishGreeting();
      return;
    }

    speaker.speak(spokenIntro, lip).then(() => {
      finishGreeting();
    }).catch((err) => {
      console.warn('[AURA] Intro speech note:', err);
      finishGreeting();
    });
  };

  // Render the flagship visual introduction card in chat
  chat.addSiyaIntroductionCard({
    user: curUser,
    onAction: (prompt) => send(prompt),
    onSpeakIntro: () => {
      speaker.cancel();
      playIntroSpeech();
    },
    onVoice: () => toggleMic(),
    onResumeDrawer: () => shell.openDrawer('resume'),
    onInterview: () => {
      if (activeResume) {
        interviewArena.open();
      } else {
        askToUploadResumeFirst('interview');
      }
    }
  });

  // Open chat drawer on boot so Siya's introduction is front-and-center
  shell.openDrawer('chat');

  // Automatically start introduction speech & greeting on site load
  setTimeout(() => {
    if (!introHasSpoken) {
      playIntroSpeech();
    }
  }, 400);

  // One-time interaction unlock: satisfies browser autoplay policies on first click/touch/keypress if blocked
  const onFirstInteraction = () => {
    window.removeEventListener('pointerdown', onFirstInteraction);
    window.removeEventListener('keydown', onFirstInteraction);
    window.removeEventListener('touchstart', onFirstInteraction);
    window.removeEventListener('click', onFirstInteraction);

    if (window.speechSynthesis && window.speechSynthesis.paused) {
      try { window.speechSynthesis.resume(); } catch { /* noop */ }
    }
    if (speaker.elevenSpeaker?.audioContext && speaker.elevenSpeaker.audioContext.state === 'suspended') {
      speaker.elevenSpeaker.audioContext.resume().catch(() => {});
    }
    if (!introHasSpoken && !speaker.speaking && !speaker.muted) {
      playIntroSpeech();
    }
  };
  window.addEventListener('pointerdown', onFirstInteraction, { once: true, passive: true });
  window.addEventListener('keydown', onFirstInteraction, { once: true, passive: true });
  window.addEventListener('touchstart', onFirstInteraction, { once: true, passive: true });
  window.addEventListener('click', onFirstInteraction, { once: true, passive: true });

  if (!sttSupported) chat.system('Note —', 'voice input needs Chrome or Edge');
  setState('idle');

  // Expose a small handle for debugging without polluting the UI.
  window.AURA = { stage, avatar, rig, expressions, lip, cavity, speaker, mic, send, updateModelBadge, auth, authModal };
}

const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

boot().catch((err) => {
  console.error('[Boot Error]', err);
  const s = $('#loader-status');
  if (s) s.textContent = `Startup error: ${err?.message || 'Check browser console'}`;
});

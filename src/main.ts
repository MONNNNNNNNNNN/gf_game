import './ui/styles/index.css';
import { router } from './app/router';
import { mountSettingsModal } from './ui/components/SettingsModal';
import { mountNicknameGate } from './ui/screens/NicknameGate';
import * as storage from './lib/storage';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.className = 'h-full w-full';

router.init(app);
mountSettingsModal();

if (storage.getNickname()) {
  router.go('home');
} else {
  mountNicknameGate(app, () => router.go('home'));
}

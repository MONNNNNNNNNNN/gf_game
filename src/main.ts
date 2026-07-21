import './ui/styles/index.css';
import { router } from './app/router';
import { mountSettingsModal } from './ui/components/SettingsModal';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.className = 'h-full w-full';

router.init(app);
mountSettingsModal();
router.go('home');

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settings.store';

export default function SettingsPage() {
  const { openDrawer } = useSettingsStore();
  const navigate = useNavigate();

  useEffect(() => {
    openDrawer('preferences');
    navigate('/profile', { replace: true });
  }, [openDrawer, navigate]);

  return null;
}

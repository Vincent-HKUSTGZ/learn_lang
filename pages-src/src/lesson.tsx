import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import LessonPage from '../../app/lesson/page';
import '../../app/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LessonPage />
  </StrictMode>,
);

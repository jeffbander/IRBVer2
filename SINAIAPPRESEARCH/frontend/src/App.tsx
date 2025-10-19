import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { StudyListPage } from './pages/StudyListPage';
import { StudyDetailPage } from './pages/StudyDetailPage';

const App = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/studies" replace />} />
        <Route path="/studies" element={<StudyListPage />} />
        <Route path="/studies/:studyId" element={<StudyDetailPage />} />
        <Route path="*" element={<Navigate to="/studies" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;

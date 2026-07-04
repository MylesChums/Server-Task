import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppHeader from './components/AppHeader';
import TaskList from './components/TaskList';
import CreateTask from './components/CreateTask';
import TaskDetail from './components/TaskDetail';

function App() {
  return (
    <BrowserRouter>
      <AppHeader />
      <Routes>
        <Route path="/" element={<TaskList />} />
        <Route path="/new" element={<CreateTask />} />
        <Route path="/tasks/:taskId" element={<TaskDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

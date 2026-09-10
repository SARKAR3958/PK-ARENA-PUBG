import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamsScreen } from '../components/TeamsScreen';

export function Teams() {
  const navigate = useNavigate();
  return <TeamsScreen onClose={() => navigate(-1)} />;
}

import { useEffect } from 'react'
import AppRouter from './router'
import { getCouncilRole, getUser } from './hooks/useAuth'
import { prefetchRoleModules } from './utils/rolePrefetch'

function App() {
  useEffect(() => {
    const user = getUser();
    if (!user) return;
    prefetchRoleModules(user.role, getCouncilRole());
  }, []);

  return <AppRouter />
}

export default App

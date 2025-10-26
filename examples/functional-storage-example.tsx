import React from 'react';
import { withRSCTrace, configure } from '../src';
import { storage } from '../src/storage';

configure({
  logLevel: 'debug',
  debugContext: true,
  performance: {
    enabled: true,
    trackMemory: true,
  },
});

async function UserDashboard({ userId }: { userId: string }) {
  return storage.withContext(async () => {
    const endCheckpoint = storage.checkpoint('user-data-fetch');

    await new Promise(resolve => setTimeout(resolve, 100));

    endCheckpoint();

    const userData = storage.withMemoryTracking('process-user-data', () => {
      return {
        id: userId,
        name: 'John Doe',
        preferences: { theme: 'dark', notifications: true }
      };
    });

    return (
      <div>
        <h2>Dashboard</h2>
        <p>User: {userData.name}</p>
        <p>Theme: {userData.preferences.theme}</p>
      </div>
    );
  }, { trackMemory: true });
}

const authScope = storage.scope('auth');

async function LoginPanel() {
  return authScope.trace('login-flow', async (traceId) => {
    console.log('Login trace ID:', traceId);

    const result = await authScope.measureAsync('validate-credentials', async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { success: true, token: 'abc123' };
    });

    return (
      <div>
        <h3>Login</h3>
        <p>Status: {result.success ? 'Success' : 'Failed'}</p>
      </div>
    );
  });
}

const TracedDashboard = withRSCTrace(UserDashboard, {
  componentName: 'UserDashboard',
  tags: ['user', 'dashboard'],
});

const TracedLogin = withRSCTrace(LoginPanel, {
  componentName: 'LoginPanel',
  tags: ['auth'],
});

export async function FunctionalStorageExample() {
  const stats = storage.getStats();
  console.log('Storage stats:', stats);

  return (
    <div>
      <h1>Functional Storage API Example</h1>

      <section>
        <TracedDashboard userId="user-123" />
      </section>

      <section>
        <TracedLogin />
      </section>

      <section>
        <h2>Features Demonstrated</h2>
        <ul>
          <li>✅ Functional API - no classes needed</li>
          <li>✅ withContext() for request isolation</li>
          <li>✅ checkpoint() for performance tracking</li>
          <li>✅ withMemoryTracking() for memory monitoring</li>
          <li>✅ scope() for feature-specific tracking</li>
          <li>✅ Modern Next.js patterns</li>
        </ul>
      </section>
    </div>
  );
}

export default FunctionalStorageExample;
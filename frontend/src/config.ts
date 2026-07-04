// Stand-in for real authentication (e.g. Cognito). The backend has no auth
// layer, so every request is scoped to this fixed demo user id.
export const CURRENT_USER_ID = 'demo-user';

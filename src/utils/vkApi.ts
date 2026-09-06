import bridge from '@vkontakte/vk-bridge';

export interface LaunchParams {
  userId: number;
  groupId: number;
  appId: number;
}

let cachedLaunchParams: LaunchParams | null = null;
let cachedUserToken: string | null = null;

// Обёртка с таймаутом — чтобы bridge.send не висел вечно
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms),
    ),
  ]);
}

export async function getLaunchParams(): Promise<LaunchParams | null> {
  if (cachedLaunchParams) return cachedLaunchParams;
  try {
    const result = await withTimeout(
      bridge.send('VKWebAppGetLaunchParams'),
      3000,
    ) as Record<string, unknown>;
    cachedLaunchParams = {
      userId: Number(result.vk_user_id) || 0,
      groupId: Number(result.vk_group_id) || 0,
      appId: Number(result.vk_app_id) || 0,
    };
    return cachedLaunchParams;
  } catch {
    return null;
  }
}

export async function getUserToken(appId: number): Promise<string | null> {
  if (cachedUserToken) return cachedUserToken;
  try {
    const result = await withTimeout(
      bridge.send('VKWebAppGetAuthToken', {
        app_id: appId,
        scope: 'groups',
      }),
      3000,
    ) as { access_token: string };
    cachedUserToken = result.access_token;
    return result.access_token;
  } catch {
    return null;
  }
}

export async function callApiMethod(
  method: string,
  params: Record<string, unknown>,
  accessToken: string,
): Promise<unknown> {
  try {
    const result = await withTimeout(
      bridge.send('VKWebAppCallAPIMethod', {
        method,
        params: {
          ...params,
          v: '5.199',
          access_token: accessToken,
        },
      }),
      5000,
    );
    return (result as { response?: unknown }).response ?? result;
  } catch {
    return null;
  }
}

export async function detectGroupRole(
  userId: number,
): Promise<{
  groupId: number;
  groupName: string | null;
  role: 'admin' | 'employee' | 'none';
}> {
  const launch = await getLaunchParams();

  if (!launch || launch.groupId === 0) {
    return { groupId: 0, groupName: null, role: 'none' };
  }

  const token = await getUserToken(launch.appId);
  if (!token) {
    return { groupId: launch.groupId, groupName: null, role: 'none' };
  }

  const memberInfo = await callApiMethod(
    'groups.getMember',
    { group_id: launch.groupId, user_id: userId, extended: 1 },
    token,
  ) as { member?: number; role?: string } | null;

  if (!memberInfo || memberInfo.member !== 1) {
    return { groupId: launch.groupId, groupName: null, role: 'none' };
  }

  const role: 'admin' | 'employee' =
    memberInfo.role === 'administrator' || memberInfo.role === 'creator'
      ? 'admin'
      : 'employee';

  const groupInfo = await callApiMethod(
    'groups.getById',
    { group_id: launch.groupId },
    token,
  ) as Array<{ name?: string }> | null;

  const groupName = groupInfo?.[0]?.name || `Сообщество #${launch.groupId}`;

  return { groupId: launch.groupId, groupName, role };
}

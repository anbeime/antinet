import { createContext, useState, useEffect, useCallback, useContext } from "react";
import { v4 as uuidv4 } from "uuid";

export type Permission = 'admin' | 'edit' | 'comment' | 'view' | 'read' | 'write';

interface UserInfo {
  id: string;
  name: string;
  avatar: string;
  color: string;
  role: string;
  permissions: Permission[];
  memberId?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  logout: () => void;
  userInfo: UserInfo;
  updateUserName: (name: string) => Promise<void>;
  updatePermissions: (permissions: Permission[], role?: string, memberId?: number) => void;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  token: string;
}

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅'];
const COLORS = [
  'from-blue-400 to-blue-500', 'from-green-400 to-green-500',
  'from-yellow-400 to-yellow-500', 'from-red-400 to-red-500',
  'from-purple-400 to-purple-500', 'from-pink-400 to-pink-500',
  'from-indigo-400 to-indigo-500', 'from-orange-400 to-orange-500',
];

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const defaultUserInfo: UserInfo = { id: '', name: '', avatar: '', color: '', role: 'member', permissions: ['view', 'read'] };

const API_BASE = import.meta.env.DEV ? '' : `${window.location.protocol}//${window.location.hostname}:8000`;

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  logout: () => {},
  userInfo: defaultUserInfo,
  updateUserName: async () => {},
  updatePermissions: () => {},
  hasPermission: () => false,
  isAdmin: false,
  token: '',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>(defaultUserInfo);
  const [token, setToken] = useState('');
  const [showNameDialog, setShowNameDialog] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('zhiyi_token');
    const storedUser = localStorage.getItem('zhiyi_user');
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUserInfo(JSON.parse(storedUser));
        setIsAuthenticated(true);
        _verifyToken(storedToken);
      } catch {
        setShowNameDialog(true);
      }
    } else {
      setShowNameDialog(true);
    }
  }, []);

  const _verifyToken = async (tok: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUserInfo(prev => ({ ...prev, role: data.role, permissions: data.permissions }));
      } else {
        localStorage.removeItem('zhiyi_token');
        localStorage.removeItem('zhiyi_user');
        setShowNameDialog(true);
      }
    } catch {}
  };

  const updateUserName = async (name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password: '' }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('zhiyi_token', data.token);
        const newUser: UserInfo = {
          id: data.user_id,
          name: data.name,
          avatar: userInfo.avatar || getRandomElement(AVATARS),
          color: userInfo.color || getRandomElement(COLORS),
          role: data.role,
          permissions: data.permissions,
        };
        setUserInfo(newUser);
        localStorage.setItem('zhiyi_user', JSON.stringify(newUser));
        setIsAuthenticated(true);
        setShowNameDialog(false);
        return;
      }
    } catch {}
    const newUser: UserInfo = {
      ...userInfo,
      id: userInfo.id || uuidv4(),
      name: name.trim(),
      avatar: userInfo.avatar || getRandomElement(AVATARS),
      color: userInfo.color || getRandomElement(COLORS),
      role: 'member',
      permissions: ['view', 'read', 'write'],
    };
    setUserInfo(newUser);
    localStorage.setItem('zhiyi_user', JSON.stringify(newUser));
    setIsAuthenticated(true);
    setShowNameDialog(false);
  };

  const updatePermissions = useCallback((permissions: Permission[], role?: string, memberId?: number) => {
    setUserInfo(prev => {
      const newUser = { ...prev, permissions, role: role || prev.role, memberId: memberId ?? prev.memberId };
      localStorage.setItem('zhiyi_user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (userInfo.permissions.includes('admin')) return true;
    if (userInfo.role === 'admin') return true;
    return userInfo.permissions.includes(permission);
  }, [userInfo.permissions, userInfo.role]);

  const isAdmin = userInfo.permissions.includes('admin') || userInfo.role === 'admin';

  const logout = () => {
    localStorage.removeItem('zhiyi_token');
    localStorage.removeItem('zhiyi_user');
    setToken('');
    setIsAuthenticated(false);
    setUserInfo(defaultUserInfo);
    setShowNameDialog(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout, userInfo, updateUserName, updatePermissions, hasPermission, isAdmin, token }}>
      {children}
      {showNameDialog && !isAuthenticated && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '400px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>欢迎使用知易</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>请输入你的昵称，以便团队成员识别</p>
            <input
              id="nickname-input"
              type="text"
              placeholder="输入昵称"
              maxLength={20}
              style={{ width: '100%', padding: '12px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginBottom: '20px', boxSizing: 'border-box' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) updateUserName(input.value);
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('nickname-input') as HTMLInputElement;
                if (input?.value.trim()) updateUserName(input.value);
              }}
              style={{ width: '100%', padding: '12px', fontSize: '16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              进入系统
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function withPermission<P extends object>(
  WrappedComponent: React.FC<P>,
  requiredPermission: Permission,
  Fallback?: React.FC
): React.FC<P> {
  return function PermissionGuard(props: P) {
    const { hasPermission } = useContext(AuthContext);
    if (!hasPermission(requiredPermission)) {
      return Fallback ? <Fallback /> : null;
    }
    return <WrappedComponent {...props} />;
  };
}

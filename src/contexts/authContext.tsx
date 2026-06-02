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
  memberId?: number; // 关联的团队成员ID
}

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  logout: () => void;
  userInfo: UserInfo;
  updateUserName: (name: string) => void;
  updatePermissions: (permissions: Permission[], role?: string, memberId?: number) => void;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
}

const AVATARS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅'];
const COLORS = [
  'from-blue-400 to-blue-500',
  'from-green-400 to-green-500',
  'from-yellow-400 to-yellow-500',
  'from-red-400 to-red-500',
  'from-purple-400 to-purple-500',
  'from-pink-400 to-pink-500',
  'from-indigo-400 to-indigo-500',
  'from-orange-400 to-orange-500',
];

const getRandomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

const defaultUserInfo: UserInfo = { id: '', name: '', avatar: '', color: '', role: 'member', permissions: ['view', 'read'] };

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  logout: () => {},
  userInfo: defaultUserInfo,
  updateUserName: () => {},
  updatePermissions: () => {},
  hasPermission: () => false,
  isAdmin: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>(defaultUserInfo);
  const [showNameDialog, setShowNameDialog] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('zhiyi_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        // 兼容旧数据：补充 role 和 permissions 字段
        if (!user.role) user.role = 'member';
        if (!user.permissions) user.permissions = ['view', 'read', 'write'];
        setUserInfo(user);
        setIsAuthenticated(true);
      } catch {
        setShowNameDialog(true);
      }
    } else {
      setShowNameDialog(true);
    }
  }, []);

  const updateUserName = (name: string) => {
    const newUser: UserInfo = {
      ...userInfo,
      id: userInfo.id || uuidv4(),
      name: name.trim(),
      avatar: userInfo.avatar || getRandomElement(AVATARS),
      color: userInfo.color || getRandomElement(COLORS),
      role: userInfo.role || 'member',
      permissions: userInfo.permissions.length > 0 ? userInfo.permissions : ['view', 'read', 'write'],
    };
    setUserInfo(newUser);
    localStorage.setItem('zhiyi_user', JSON.stringify(newUser));
    setIsAuthenticated(true);
    setShowNameDialog(false);
  };

  const updatePermissions = useCallback((permissions: Permission[], role?: string, memberId?: number) => {
    setUserInfo(prev => {
      const newUser: UserInfo = {
        ...prev,
        permissions,
        role: role || prev.role,
        memberId: memberId ?? prev.memberId,
      };
      localStorage.setItem('zhiyi_user', JSON.stringify(newUser));
      return newUser;
    });
  }, []);

  const hasPermission = useCallback((permission: Permission): boolean => {
    // admin 拥有所有权限
    if (userInfo.permissions.includes('admin')) return true;
    if (userInfo.role === 'admin') return true;
    return userInfo.permissions.includes(permission);
  }, [userInfo.permissions, userInfo.role]);

  const isAdmin = userInfo.permissions.includes('admin') || userInfo.role === 'admin';

  const logout = () => {
    localStorage.removeItem('zhiyi_user');
    setIsAuthenticated(false);
    setUserInfo(defaultUserInfo);
    setShowNameDialog(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, logout, userInfo, updateUserName, updatePermissions, hasPermission, isAdmin }}>
      {children}
      {showNameDialog && !isAuthenticated && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white',
            padding: '30px',
            borderRadius: '16px',
            width: '400px',
            textAlign: 'center',
          }}>
            <h2 style={{ marginBottom: '20px', color: '#333' }}>欢迎使用知易</h2>
            <p style={{ marginBottom: '20px', color: '#666' }}>请输入你的昵称，以便团队成员识别</p>
            <input
              id="nickname-input"
              type="text"
              placeholder="输入昵称"
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                marginBottom: '20px',
                boxSizing: 'border-box',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    updateUserName(input.value);
                  }
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('nickname-input') as HTMLInputElement;
                if (input?.value.trim()) {
                  updateUserName(input.value);
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              进入系统
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// 权限守卫 HOC
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

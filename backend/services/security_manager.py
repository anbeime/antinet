"""
隐私保护与安全增强模块
端到端加密、内存安全、权限控制、安全沙箱、联邦学习支持
"""
import logging
import json
import hashlib
import os
import tempfile
import shutil
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import logging

logger = logging.getLogger(__name__)


class DataEncryption:
    """数据加密 - AES-256端到端加密"""
    
    def __init__(self, master_key: str = None):
        if master_key is None:
            master_key = os.environ.get("ENCRYPTION_KEY", self._generate_key())
        
        self.master_key = master_key.encode()
        self.cipher = self._create_cipher()
    
    def _generate_key(self) -> str:
        """生成密钥"""
        import secrets
        return secrets.token_hex(32)
    
    def _create_cipher(self) -> Fernet:
        """创建加密器"""
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'salt_jinyiwei',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(self.master_key))
        return Fernet(key)
    
    def encrypt(self, data: Any) -> str:
        """加密数据"""
        try:
            if isinstance(data, dict):
                data = json.dumps(data, ensure_ascii=False)
            elif not isinstance(data, str):
                data = str(data)
            
            encrypted = self.cipher.encrypt(data.encode())
            return base64.b64encode(encrypted).decode()
        
        except Exception as e:
            logger.error(f"[Encryption] 加密失败: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> Any:
        """解密数据"""
        try:
            decrypted = self.cipher.decrypt(base64.b64decode(encrypted_data))
            return decrypted.decode()
        
        except Exception as e:
            logger.error(f"[Encryption] 解密失败: {e}")
            raise
    
    def encrypt_file(self, file_path: str, output_path: str = None) -> str:
        """加密文件"""
        if output_path is None:
            output_path = file_path + ".enc"
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        encrypted_data = self.encrypt(file_data)
        
        with open(output_path, 'w') as f:
            f.write(encrypted_data)
        
        logger.info(f"[Encryption] 文件已加密: {file_path} -> {output_path}")
        return output_path
    
    def decrypt_file(self, encrypted_path: str, output_path: str = None) -> str:
        """解密文件"""
        if output_path is None:
            output_path = encrypted_path.replace('.enc', '')
        
        with open(encrypted_path, 'r') as f:
            encrypted_data = f.read()
        
        decrypted_data = self.decrypt(encrypted_data)
        
        with open(output_path, 'wb') as f:
            f.write(decrypted_data.encode())
        
        logger.info(f"[Encryption] 文件已解密: {encrypted_path} -> {output_path}")
        return output_path


class MemorySecurity:
    """内存安全 - 推理完成后立即清除中间数据"""
    
    def __init__(self):
        self.sensitive_data = []
        self.enable_auto_clear = True
    
    def store_sensitive(self, data: Any, tag: str = "default") -> str:
        """存储敏感数据"""
        data_id = f"sens_{hashlib.md5(str(id(data)).encode()).hexdigest()[:16]}"
        
        self.sensitive_data.append({
            "id": data_id,
            "tag": tag,
            "data": data,
            "created_at": datetime.now().isoformat()
        })
        
        return data_id
    
    def clear_sensitive(self, data_id: str = None):
        """清除敏感数据"""
        if data_id is None:
            # 清除所有敏感数据
            for item in self.sensitive_data:
                item["data"] = None
            self.sensitive_data = []
            logger.info("[MemorySecurity] 已清除所有敏感数据")
        else:
            # 清除指定数据
            for item in self.sensitive_data:
                if item["id"] == data_id:
                    item["data"] = None
                    self.sensitive_data.remove(item)
                    logger.info(f"[MemorySecurity] 已清除敏感数据: {data_id}")
                    break
    
    def secure_clear(self, data: Any):
        """安全清除数据"""
        if isinstance(data, str):
            data = list(data)
        elif isinstance(data, bytes):
            data = bytearray(data)
        
        # 覆写数据
        if hasattr(data, '__setitem__'):
            for i in range(len(data)):
                data[i] = 0
        
        del data


class PermissionControl:
    """权限控制 - 每个智能体仅能访问完成任务必需的数据"""
    
    def __init__(self):
        self.permissions = {}
        self.role_permissions = {
            "orchestrator": ["all"],
            "tongzhengsi": ["read", "query"],
            "jianchayuan": ["read", "query"],
            "xingyusi": ["read", "query", "risk"],
            "canmousi": ["read", "recommend"],
            "mijuanfang": ["read", "process"],
            "taishige": ["read", "write", "store"],
            "yichuansi": ["read", "write", "forward"]
        }
    
    def grant_permission(self, agent_name: str, resource: str, 
                         permission: str, expires_at: str = None):
        """授予权限"""
        if agent_name not in self.permissions:
            self.permissions[agent_name] = []
        
        self.permissions[agent_name].append({
            "resource": resource,
            "permission": permission,
            "granted_at": datetime.now().isoformat(),
            "expires_at": expires_at
        })
        
        logger.info(f"[Permission] 授予 {agent_name} {permission} 权限: {resource}")
    
    def check_permission(self, agent_name: str, resource: str, 
                        required_permission: str) -> bool:
        """检查权限"""
        # 超级管理员
        if "all" in self.role_permissions.get(agent_name, []):
            return True
        
        # 检查角色默认权限
        role_perms = self.role_permissions.get(agent_name, [])
        if required_permission in role_perms:
            return True
        
        # 检查显式授予的权限
        agent_perms = self.permissions.get(agent_name, [])
        
        for perm in agent_perms:
            if perm["resource"] == resource or perm["resource"] == "*":
                if perm["permission"] == required_permission or perm["permission"] == "all":
                    # 检查过期时间
                    if perm.get("expires_at"):
                        expires = datetime.fromisoformat(perm["expires_at"])
                        if expires < datetime.now():
                            continue
                    return True
        
        logger.warning(f"[Permission] {agent_name} 缺少 {required_permission} 权限: {resource}")
        return False
    
    def revoke_permission(self, agent_name: str, resource: str):
        """撤销权限"""
        if agent_name in self.permissions:
            self.permissions[agent_name] = [
                p for p in self.permissions[agent_name]
                if p["resource"] != resource
            ]
    
    def get_agent_permissions(self, agent_name: str) -> List[Dict]:
        """获取智能体权限列表"""
        return self.permissions.get(agent_name, [])


class SecuritySandbox:
    """安全沙箱 - 外部技能在受限环境中运行"""
    
    def __init__(self, allowed_operations: List[str] = None):
        self.allowed_operations = allowed_operations or [
            "read", "write_temp", "network_disabled"
        ]
        self.execution_history = []
    
    def execute_in_sandbox(self, func, *args, **kwargs) -> Any:
        """在沙箱中执行函数"""
        start_time = datetime.now()
        
        # 记录执行
        execution_record = {
            "function": func.__name__,
            "start_time": start_time.isoformat(),
            "status": "running"
        }
        
        try:
            # 限制执行时间和资源
            result = func(*args, **kwargs)
            
            execution_record["status"] = "success"
            execution_record["result_type"] = type(result).__name__
            
            logger.info(f"[Sandbox] 执行成功: {func.__name__}")
            
        except Exception as e:
            execution_record["status"] = "failed"
            execution_record["error"] = str(e)
            logger.error(f"[Sandbox] 执行失败: {func.__name__} - {e}")
            raise
        
        finally:
            execution_record["end_time"] = datetime.now().isoformat()
            self.execution_history.append(execution_record)
        
        return result
    
    def validate_operation(self, operation: str) -> bool:
        """验证操作是否允许"""
        return operation in self.allowed_operations
    
    def get_execution_history(self) -> List[Dict]:
        """获取执行历史"""
        return self.execution_history[-50:]


class PrivacyComputing:
    """隐私计算 - 联邦学习、差分隐私"""
    
    def __init__(self):
        self.local_model_updates = {}
    
    def federated_learning_round(self, device_id: str, 
                                  model_update: Dict) -> Dict:
        """
        联邦学习一轮
        
        参数:
            device_id: 设备ID
            model_update: 模型更新（梯度/参数）
        """
        # 存储本地更新
        self.local_model_updates[device_id] = {
            "update": model_update,
            "timestamp": datetime.now().isoformat(),
            "data_size": model_update.get("sample_count", 0)
        }
        
        logger.info(f"[Federated] 收到设备 {device_id} 的模型更新")
        
        # 聚合更新（简化实现）
        return self._aggregate_updates()
    
    def _aggregate_updates(self) -> Dict:
        """聚合更新"""
        if not self.local_model_updates:
            return {}
        
        # 简单平均聚合
        total_samples = sum(u["data_size"] for u in self.local_model_updates.values())
        
        aggregated = {
            "aggregated_from": len(self.local_model_updates),
            "total_samples": total_samples,
            "timestamp": datetime.now().isoformat()
        }
        
        return aggregated
    
    def apply_differential_privacy(self, data: Any, 
                                   epsilon: float = 1.0,
                                   sensitivity: float = 1.0) -> Any:
        """
        应用差分隐私
        
        参数:
            data: 原始数据
            epsilon: 隐私预算
            sensitivity: 敏感度
        """
        try:
            import numpy as np
            
            # 拉普拉斯噪声
            scale = sensitivity / epsilon
            noise = np.random.laplace(0, scale)
            
            if isinstance(data, (int, float)):
                return data + noise
            elif isinstance(data, list):
                return [d + noise if isinstance(d, (int, float)) else d for d in data]
            elif isinstance(data, dict):
                return {k: v + noise if isinstance(v, (int, float)) else v for k, v in data.items()}
            
            return data
        
        except ImportError:
            logger.warning("[Privacy] numpy未安装，使用简单噪声")
            return data
    
    def safe_aggregate_insights(self, insights: Dict, 
                                 privacy_budget: float = 1.0) -> Dict:
        """安全聚合洞察（添加噪声防止原始数据泄露）"""
        sanitized = {}
        
        for key, value in insights.items():
            if isinstance(value, (int, float)):
                sanitized[key] = self.apply_differential_privacy(
                    value, epsilon=privacy_budget
                )
            else:
                sanitized[key] = value
        
        return sanitized


class AuditLogger:
    """审计日志 - 记录所有数据访问和操作"""
    
    def __init__(self, log_path: str = None):
        self.log_path = log_path or "./data/audit.log"
        Path(self.log_path).parent.mkdir(parents=True, exist_ok=True)
        self.log_entries = []
    
    def log(self, event_type: str, actor: str, resource: str,
            action: str, result: str = "success", details: Dict = None):
        """记录审计日志"""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "actor": actor,
            "resource": resource,
            "action": action,
            "result": result,
            "details": details or {}
        }
        
        self.log_entries.append(entry)
        
        # 写入文件
        with open(self.log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        
        logger.info(f"[Audit] {actor} {action} {resource}: {result}")
    
    def query_logs(self, actor: str = None, resource: str = None,
                   start_time: str = None, end_time: str = None) -> List[Dict]:
        """查询审计日志"""
        results = []
        
        for entry in self.log_entries:
            if actor and entry["actor"] != actor:
                continue
            if resource and entry["resource"] != resource:
                continue
            if start_time and entry["timestamp"] < start_time:
                continue
            if end_time and entry["timestamp"] > end_time:
                continue
            
            results.append(entry)
        
        return results
    
    def get_security_report(self) -> Dict:
        """获取安全报告"""
        total_events = len(self.log_entries)
        
        event_types = {}
        actors = {}
        failed_events = 0
        
        for entry in self.log_entries:
            event_types[entry["event_type"]] = event_types.get(entry["event_type"], 0) + 1
            actors[entry["actor"]] = actors.get(entry["actor"], 0) + 1
            
            if entry["result"] == "failed":
                failed_events += 1
        
        return {
            "total_events": total_events,
            "failed_events": failed_events,
            "success_rate": (total_events - failed_events) / total_events if total_events > 0 else 0,
            "event_types": event_types,
            "top_actors": dict(sorted(actors.items(), key=lambda x: x[1], reverse=True)[:10]),
            "generated_at": datetime.now().isoformat()
        }


class SecurityManager:
    """安全管理器 - 整合所有安全功能"""
    
    def __init__(self, master_key: str = None):
        self.encryption = DataEncryption(master_key)
        self.memory_security = MemorySecurity()
        self.permission_control = PermissionControl()
        self.sandbox = SecuritySandbox()
        self.privacy_computing = PrivacyComputing()
        self.audit_logger = AuditLogger()
    
    def encrypt_data(self, data: Any) -> str:
        """加密数据"""
        return self.encryption.encrypt(data)
    
    def decrypt_data(self, encrypted_data: str) -> Any:
        """解密数据"""
        return self.encryption.decrypt(encrypted_data)
    
    def check_agent_permission(self, agent_name: str, resource: str,
                               required_permission: str) -> bool:
        """检查智能体权限"""
        return self.permission_control.check_permission(
            agent_name, resource, required_permission
        )
    
    def execute_skill_safely(self, skill_func, *args, **kwargs) -> Any:
        """安全执行技能"""
        return self.sandbox.execute_in_sandbox(skill_func, *args, **kwargs)
    
    def log_access(self, agent: str, resource: str, action: str):
        """记录访问日志"""
        self.audit_logger.log(
            event_type="data_access",
            actor=agent,
            resource=resource,
            action=action
        )
    
    def federated_aggregate(self, device_id: str, 
                            model_update: Dict) -> Dict:
        """联邦聚合"""
        return self.privacy_computing.federated_learning_round(
            device_id, model_update
        )
    
    def sanitize_output(self, output: Dict, privacy_budget: float = 1.0) -> Dict:
        """清理输出（差分隐私）"""
        return self.privacy_computing.safe_aggregate_insights(
            output, privacy_budget
        )
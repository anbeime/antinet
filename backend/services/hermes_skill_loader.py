"""
Hermes 技能加载器
扫描 C:\\D\\zhiyi\\skills\\ 目录，加载 Hermes 格式的技能
"""

import asyncio
import logging
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

SKILLS_DIR = Path("C:/D/zhiyi/skills")


def _parse_frontmatter(content: str) -> Tuple[Optional[Dict], str]:
    """解析 YAML frontmatter，支持多行 folded scalar（>）"""
    match = re.match(r"^---\n(.*?)\n---\n(.*)", content, re.DOTALL)
    if not match:
        return None, content

    yaml_text = match.group(1)
    body = match.group(2)

    metadata = {}
    current_key = None
    current_val_lines = []

    for line in yaml_text.splitlines():
        stripped = line.rstrip()
        key_match = re.match(r"^([a-zA-Z_][a-zA-Z0-9_/-]*)(\s*:\s*)(.*)$", stripped)
        if key_match and not stripped.startswith("  ") and not stripped.startswith("\t"):
            if current_key:
                val = " ".join(current_val_lines).strip()
                if val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                metadata[current_key] = val
            current_key = key_match.group(1)
            rest = key_match.group(3).strip()
            if rest in (">", "|"):
                current_val_lines = []
            else:
                current_val_lines = [rest]
        else:
            if current_key is not None:
                current_val_lines.append(stripped)

    if current_key:
        val = " ".join(current_val_lines).strip()
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
        metadata[current_key] = val

    return metadata, body


def _extract_keywords(description: str) -> List[str]:
    """从 description 中提取触发关键词"""
    zh = re.findall(r"[\u4e00-\u9fff]+", description)
    en = re.findall(r"[a-zA-Z][a-zA-Z0-9-]+", description)
    seen = set()
    result = []
    for kw in zh + en:
        k = kw.lower()
        if k not in seen and len(k) >= 2:
            seen.add(k)
            result.append(k)
    return result


class HermesSkill:
    def __init__(self, skill_dir: Path):
        self.dir = skill_dir
        self.name = skill_dir.name
        self.meta: Dict[str, Any] = {}
        self.body = ""
        self.trigger_keywords: List[str] = []
        self.cli_entry: Optional[Path] = None
        self.venv_python: Optional[Path] = None
        self.description = ""
        self.description_zh = ""
        self.enabled = True
        self._load()

    def _load(self):
        skill_md = self.dir / "SKILL.md"
        if not skill_md.exists():
            return
        try:
            content = skill_md.read_text(encoding="utf-8")
            self.meta, self.body = _parse_frontmatter(content)
            self.name = self.meta.get("name", self.name)
            self.description = self.meta.get("description", "")
            self.description_zh = self.meta.get("description_zh", "")
            desc = self.description + " " + self.description_zh
            self.trigger_keywords = _extract_keywords(desc)

            scripts_dir = self.dir / "scripts"
            if scripts_dir.exists():
                for py_file in scripts_dir.glob("*.py"):
                    if py_file.name not in ("setup.py", "requirements.py"):
                        self.cli_entry = py_file
                        break
                venv_py = scripts_dir / "venv" / "bin" / "python3"
                venv_win = scripts_dir / "venv" / "Scripts" / "python.exe"
                self.venv_python = venv_py if venv_py.exists() else (venv_win if venv_win.exists() else None)

            logger.info(f"[HermesSkill] Loaded '{self.name}' ({len(self.trigger_keywords)} triggers)")
        except Exception as e:
            logger.error(f"[HermesSkill] Failed to load {self.dir}: {e}")

    def get_info(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description_zh or self.description,
            "description_zh": self.description_zh,
            "category": "Hermes",
            "trigger_keywords": self.trigger_keywords,
            "enabled": self.enabled,
            "cli_entry": str(self.cli_entry) if self.cli_entry else None,
            "has_venv": self.venv_python is not None,
        }

    async def execute(self, query: str) -> Dict[str, Any]:
        if not self.cli_entry:
            return {"success": False, "error": "No CLI entry found", "result": ""}

        python_path = self.venv_python or sys.executable
        try:
            cmd_parts = [str(python_path), str(self.cli_entry)]

            if "help" in query.lower() or query.strip() == self.name:
                cmd_parts.append("help")
            else:
                args = query
                for kw in self.trigger_keywords:
                    args = re.sub(re.escape(kw), "", args, flags=re.IGNORECASE).strip()
                if args:
                    cmd_parts.extend(["--query", args])
                else:
                    cmd_parts.append("help")

            logger.info(f"[HermesSkill] Executing: {' '.join(cmd_parts)}")

            result = await asyncio.create_subprocess_exec(
                python_path, *cmd_parts[1:],
                cwd=str(self.dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await result.communicate()
            output = stdout.decode("utf-8", errors="replace").strip()
            error = stderr.decode("utf-8", errors="replace").strip()

            if result.returncode != 0 and not output:
                return {"success": False, "error": error or f"Exit {result.returncode}", "result": ""}

            if len(output) > 5000:
                output = output[:5000] + f"\n... [输出截断，共 {len(output)} 字符]"

            return {
                "success": True,
                "result": output,
                "error": error if result.returncode != 0 else None,
                "exit_code": result.returncode,
            }
        except Exception as e:
            logger.error(f"[HermesSkill] Execute failed: {e}")
            return {"success": False, "error": str(e), "result": ""}


class HermesSkillLoader:
    def __init__(self):
        self.skills: Dict[str, HermesSkill] = {}
        self._loaded = False

    def load(self, force: bool = False):
        if self._loaded and not force:
            return
        self.skills.clear()
        if not SKILLS_DIR.exists():
            logger.warning(f"[HermesSkillLoader] Skills dir not found: {SKILLS_DIR}")
            return
        for item in SKILLS_DIR.iterdir():
            if not item.is_dir():
                continue
            if item.name in (".git", ".venv", "node_modules", "hermes"):
                continue
            skill_md = item / "SKILL.md"
            if skill_md.exists():
                skill = HermesSkill(item)
                if skill.cli_entry:
                    self.skills[skill.name] = skill
        self._loaded = True
        logger.info(f"[HermesSkillLoader] Loaded {len(self.skills)} skills: {list(self.skills.keys())}")

    def list_skills(self) -> List[Dict[str, Any]]:
        self.load()
        return [s.get_info() for s in self.skills.values()]

    def find_matching(self, query: str) -> Optional[HermesSkill]:
        """查找匹配关键词最多的技能"""
        self.load()
        q = query.lower()
        candidates = []
        for skill in self.skills.values():
            count = sum(1 for kw in skill.trigger_keywords if kw in q)
            if count > 0:
                candidates.append((count, skill))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0], reverse=True)
        return candidates[0][1]

    def get_skill(self, name: str) -> Optional[HermesSkill]:
        self.load()
        return self.skills.get(name)

    async def execute_skill(self, name: str, query: str) -> Dict[str, Any]:
        skill = self.get_skill(name)
        if not skill:
            return {"success": False, "error": f"Skill '{name}' not found", "result": ""}
        result = await skill.execute(query)
        return {
            "skill_name": name,
            "success": result["success"],
            "result": result.get("result", ""),
            "error": result.get("error", ""),
        }


_hermes_skill_loader: Optional[HermesSkillLoader] = None


def get_hermes_skill_loader() -> HermesSkillLoader:
    global _hermes_skill_loader
    if _hermes_skill_loader is None:
        _hermes_skill_loader = HermesSkillLoader()
    return _hermes_skill_loader
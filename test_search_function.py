import sys
sys.path.insert(0, "C:/test/antinet/backend")

from routes.chat_routes import _search_cards_by_keyword
from database import DatabaseManager
from config import settings

# 初始化数据库
import routes.chat_routes as chat_routes
chat_routes.db_manager = DatabaseManager(settings.DB_PATH)

# 测试搜索
result = _search_cards_by_keyword("四色", limit=5)
print(f"Found {len(result)} cards")
for card in result:
    print(f"Card: {card}")

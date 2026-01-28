from sqlalchemy import create_engine, text, inspect
import os

# 🔥 继续使用你刚才确认的正确路径
REAL_DB_URL = r"sqlite:///E:\H_AChat\fastApiProject\backend\HA_Chat.db"

def clear_table_content(table_name):
    print(f"🎯 锁定数据库: {REAL_DB_URL}")
    
    engine = create_engine(REAL_DB_URL)
    
    # 1. 先检查表存不存在，防止报错
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        print(f"❌ 错误：表 '{table_name}' 不存在！")
        return

    print(f"⚠️ 警告：正在清空表 '{table_name}' 的所有数据...")
    print("   (表结构会保留，但数据将永久丢失)")

    with engine.begin() as conn:
        # 2. 执行清空指令
        # SQLite 中使用 DELETE FROM 来清空全表
        conn.execute(text(f"DELETE FROM {table_name}"))
        
        # 3. (可选) 如果你想让自增 ID (id) 重置为 1，需要额外清理 sqlite_sequence
        # 如果不需要重置 ID，注释掉下面这两行即可
        try:
            conn.execute(text(f"DELETE FROM sqlite_sequence WHERE name='{table_name}'"))
            print("   [提示] 自增 ID 已重置。")
        except:
            pass # 有些表可能没有自增ID，忽略错误

    print(f"✅ 成功：表 '{table_name}' 已被清空！")

if __name__ == "__main__":
    # 在这里输入你想清空的表名，比如 'chat_messages' 或 'chat_session'
    target_table = "chat_messages" 
    
    # 二次确认，防止手滑
    confirm = input(f"你确定要清空 {target_table} 吗？(y/n): ")
    if confirm.lower() == 'y':
        clear_table_content(target_table)
    else:
        print("已取消操作。")
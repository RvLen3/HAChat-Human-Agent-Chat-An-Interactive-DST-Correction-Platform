import sys
print(f"Python Executable: {sys.executable}")

print("\n--- 尝试导入 convlab ---")
try:
    import convlab
    print(f"✅ convlab 基础包导入成功! 路径: {convlab.__file__}")
except ImportError as e:
    print(f"❌ convlab 基础包导入失败: {e}")

print("\n--- 尝试导入 SVMNLU ---")
try:
    from convlab.nlu.svm.multiwoz import SVMNLU
    print("✅ SVMNLU 导入成功!")
except ImportError as e:
    print(f"❌ SVMNLU 导入失败. 错误详情:\n{e}")
except Exception as e:
    print(f"❌ 发生其他错误:\n{e}")
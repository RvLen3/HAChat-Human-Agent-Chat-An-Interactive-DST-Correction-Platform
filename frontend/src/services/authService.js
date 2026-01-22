const API_BASE_URL = "http://localhost:8000/api";

/**
 * 注册请求
 * 后端要求格式: { ID, username, password }
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, { //这里才是后端需要的接口
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      // 尝试获取后端返回的错误信息，如果没有则给默认值
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || '注册失败，服务器响应异常');
    }

    return await response.json();
  } catch (error) {
    // 将错误向上抛出，交给 LoginPage 处理
    throw error;
  }
};
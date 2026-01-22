// 预计包含IsLogin ,SetToken, RemoveToken 三个函数


export const isUserLoggedIn = () => {
    const hasCookie = document.cookie.get('user_token');
    const hasLocalToken = localStorage.getItem('token');
    return hasLocalToken || hasCookie;
}
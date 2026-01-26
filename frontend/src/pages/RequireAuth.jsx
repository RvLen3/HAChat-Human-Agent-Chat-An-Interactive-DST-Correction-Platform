// 修正了拼写错误
import { Navigate, useLocation } from 'react-router-dom';

// 判断是否登录
const UseAuth = () => {
    const token = localStorage.getItem('user_token');
    // 注意：这里只是简单的非空判断，return !!token 意味着只要有值就为 true
    return !!token;
}

export default function RequireAuth({ children }) {
    const isAuth = UseAuth();
    const location = useLocation();

    if (!isAuth) {
        console.log('1')
        // 未登录，重定向到登录页
        // 注意这里是 Navigate，不是 Naviagte
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    console.log('2')
    // 已登录,渲染子组件
    return children;
}
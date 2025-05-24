// 创建随机心形背景
document.addEventListener('DOMContentLoaded', function () {
  createHearts();
  initLoginForm();
});

// 创建随机心形动画
function createHearts() {
  const heartsContainer = document.querySelector('.hearts-container');
  const heartCount = 20;

  for (let i = 0; i < heartCount; i++) {
    setTimeout(() => {
      const heart = document.createElement('div');
      heart.classList.add('heart');

      // 随机尺寸
      const size = Math.random() * 20 + 10;
      heart.style.width = `${size}px`;
      heart.style.height = `${size}px`;

      // 随机位置和动画
      const left = Math.random() * 100;
      const animDuration = Math.random() * 10 + 5;
      const animDelay = Math.random() * 5;

      heart.style.left = `${left}%`;
      heart.style.animation = `float ${animDuration}s linear ${animDelay}s infinite`;

      // 随机颜色
      const colors = ['rgba(255, 121, 198, 0.3)', 'rgba(255, 82, 82, 0.3)', 'rgba(255, 180, 196, 0.3)'];
      const color = colors[Math.floor(Math.random() * colors.length)];
      heart.style.backgroundColor = color;

      // 设置伪元素的颜色
      heart.style.setProperty('--heart-color', color);

      heartsContainer.appendChild(heart);

      // 处理伪元素的颜色
      heart.style.setProperty('--pseudo-color', color);

      // 自动在一段时间后移除元素
      setTimeout(() => {
        heart.remove();
      }, (animDuration + animDelay) * 1000);
    }, i * 300);
  }

  // 每15秒重新创建一批心形
  setTimeout(createHearts, 15000);
}

// 初始化登录表单
function initLoginForm() {
  const loginBtn = document.getElementById('login-btn');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const errorMessage = document.getElementById('error-message');
  const rememberMeCheckbox = document.getElementById('remember-me');

  // 检查是否有存储的用户名和密码
  const rememberedUser = localStorage.getItem('rememberedUser');
  if (rememberedUser) {
    try {
      const userData = JSON.parse(rememberedUser);
      usernameInput.value = userData.username || '';
      passwordInput.value = userData.password || '';
      rememberMeCheckbox.checked = true;
    } catch (e) {
      console.error('Failed to parse remembered user data');
    }
  }

  // 登录按钮点击事件
  loginBtn.addEventListener('click', async function (event) {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // 简单客户端验证
    if (!username || !password) {
      showError('用户名和密码不能为空');
      return;
    }

    // 禁用按钮，显示加载状态
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

    try {
      // 调用后端API进行登录验证
      const response = await login(username, password);
      console.log('登录响应结果:', response); // 调试输出

      // 处理登录成功
      if (response && response.success) {
        // 保存认证信息
        saveAuthToken(response.token);

        // 如果勾选了"记住我"，则保存用户名和密码
        if (rememberMeCheckbox.checked) {
          localStorage.setItem('rememberedUser', JSON.stringify({
            username: username,
            password: password
          }));
        } else {
          // 如果未勾选，则清除之前保存的信息
          localStorage.removeItem('rememberedUser');
        }

        // 显示成功消息
        alert('登录成功，即将跳转到首页！');

        // 获取当前路径
        const currentPath = window.location.pathname;
        const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);

        // 延迟跳转到主页
        setTimeout(() => {
          console.log('执行页面跳转到:', currentDir + 'index.html');
          // 使用绝对路径确保跳转正确
          window.location.href = currentDir + 'index.html';
        }, 1000);
      } else {
        // 显示错误消息
        showError(response.message || '登录失败，请检查用户名和密码');
      }
    } catch (error) {
      console.error('Login error:', error);
      showError('服务器连接失败，请稍后再试');
    } finally {
      // 恢复按钮状态
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>登录</span><i class="fas fa-arrow-right ml-2"></i>';
    }
  });

  // 显示错误消息
  function showError(message) {
    errorMessage.textContent = message;
    loginError.classList.remove('hidden');

    // 5秒后隐藏错误信息
    setTimeout(() => {
      loginError.classList.add('hidden');
    }, 5000);
  }

  // 回车键提交表单
  passwordInput.addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
      loginBtn.click();
    }
  });
}

// 登录API调用
async function login(username, password) {
  try {
    // 检查当前页面是否通过文件协议打开
    const isFileProtocol = window.location.protocol === 'file:';

    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username,
        password: password
      }),
      mode: 'cors'
    };

    // 只有在非文件协议时才添加credentials
    if (!isFileProtocol) {
      fetchOptions.credentials = 'include';
    }

    console.log('请求选项:', fetchOptions);

    const response = await fetch('http://localhost:8081/api/auth/login', fetchOptions);

    const data = await response.json();
    console.log('登录响应:', data);
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      message: '服务器连接失败，请检查后端服务是否运行'
    };
  }
}

// 保存认证令牌到本地存储
function saveAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loginTime', new Date().getTime());
    console.log('认证令牌已保存, 准备跳转到首页');
  }
} 
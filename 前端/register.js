// API基础URL
const API_BASE_URL = 'http://localhost:8081/api';

// 创建随机心形背景
document.addEventListener('DOMContentLoaded', function () {
  createHearts();
  initRegisterForm();
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

// 初始化注册表单
function initRegisterForm() {
  const registerBtn = document.getElementById('register-btn');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const fullNameInput = document.getElementById('fullName');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const registerError = document.getElementById('register-error');
  const errorMessage = document.getElementById('error-message');

  // 注册按钮点击事件
  registerBtn.addEventListener('click', async function (event) {
    event.preventDefault();

    // 获取表单数据
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // 客户端表单验证
    if (!username || !email || !password || !confirmPassword) {
      showError('所有字段都为必填项');
      return;
    }

    // 验证邮箱格式
    if (!isValidEmail(email)) {
      showError('请输入有效的邮箱地址');
      return;
    }

    // 验证密码长度
    if (password.length < 6) {
      showError('密码长度至少为6个字符');
      return;
    }

    // 验证两次密码输入是否一致
    if (password !== confirmPassword) {
      showError('两次输入的密码不一致');
      return;
    }

    // 禁用按钮，显示加载状态
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 注册中...';

    try {
      // 调用后端API进行注册
      const response = await register({
        username: username,
        email: email,
        fullName: fullName,
        password: password
      });

      // 处理注册成功
      if (response.success) {
        // 显示成功消息并跳转到登录页面
        alert('注册成功！请登录您的账号。');
        window.location.href = 'login.html';
      } else {
        // 显示错误消息
        showError(response.message || '注册失败，请稍后再试');
      }
    } catch (error) {
      console.error('Register error:', error);
      showError('服务器连接失败，请稍后再试');
    } finally {
      // 恢复按钮状态
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<span>注册账号</span><i class="fas fa-user-plus ml-2"></i>';
    }
  });

  // 显示错误消息
  function showError(message) {
    errorMessage.textContent = message;
    registerError.classList.remove('hidden');

    // 5秒后隐藏错误信息
    setTimeout(() => {
      registerError.classList.add('hidden');
    }, 5000);
  }

  // 回车键提交表单
  confirmPasswordInput.addEventListener('keyup', function (event) {
    if (event.key === 'Enter') {
      registerBtn.click();
    }
  });
}

// 验证邮箱格式
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 注册API调用
async function register(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData),
      mode: 'cors'
    });

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return {
      success: false,
      message: '服务器连接失败，请检查后端服务是否运行'
    };
  }
} 
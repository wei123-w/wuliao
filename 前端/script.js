// 检查认证状态的重试计数器
let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;

// 认证检查
function checkAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const authToken = localStorage.getItem('authToken');
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0');
  const currentTime = new Date().getTime();

  // 检查令牌是否过期（24小时）
  const isTokenExpired = currentTime - loginTime > 24 * 60 * 60 * 1000;

  if (!isLoggedIn || !authToken || isTokenExpired) {
    authRetryCount = 0; // 重置重试计数器
    console.log('未登录或令牌过期');
    return false;
  }

  return true;
}

// 获取认证头
function getAuthHeader() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('认证令牌不存在，用户可能未登录');
    return { 'Content-Type': 'application/json' };
  }

  console.log('使用认证令牌:', token.substring(0, 10) + '...');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

// API基础URL
const API_BASE_URL = 'http://localhost:8081/api';

// 添加全局请求拦截器处理401错误
function handleApiError(error) {
  console.error('API请求错误:', error);

  // 检查是否是401未授权错误
  if (error.status === 401 || (error.response && error.response.status === 401)) {
    // 如果用户已登录但令牌失效，清除登录状态
    if (localStorage.getItem('authToken')) {
      console.log('登录令牌已过期，需要重新登录');
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginTime');

      // 显示提示消息
      showToast('登录已过期，请重新登录');

      // 延迟跳转到登录页面
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      // 用户未登录，显示提示
      showToast('请先登录后再操作');
    }
    return Promise.reject('未授权，请先登录');
  }

  return Promise.reject(error);
}

// 存储故事数据的数组
let stories = [
  {
    id: 1,
    title: '相遇在雨中',
    content: '那是一个雨天，我忘记带伞，正当我站在店门口犹豫时，一把伞遮在了我的头顶。回头一看，是他，带着温柔的笑容问我："需要帮忙吗？"就这样，我们的故事开始了...',
    images: ['images/stories/story1.jpg']
  },
  {
    id: 2,
    title: '千里之外的心动',
    content: '我们相隔两座城市，通过网络认识。每天晚上的视频通话成了最期待的时刻。半年后，我鼓起勇气跨越500公里去见他，当列车到站，他捧着999朵玫瑰在站台等我...',
    images: ['images/stories/story2.jpg']
  }
];

// 页面加载时从本地存储加载故事
window.addEventListener('load', function () {
  loadFromLocalStorage();
});

// 初始化AOS动画库
document.addEventListener('DOMContentLoaded', function () {
  // 清理本地存储，避免配额超限
  cleanupLocalStorage();

  // 检查用户是否已认证
  if (!checkAuth()) {
    console.log('用户未登录或令牌已过期，部分功能可能受限');
  }

  // 获取用户信息
  getCurrentUser();

  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
  });

  // 初始化爱情故事功能
  initStoryFeatures();

  // 创建心形动画元素
  createHearts();

  // 初始化故事卡片展开功能
  initStoryCards();

  // 初始化留言墙功能
  initMessageWall();

  // 初始化礼物心愿单功能
  initWishlist();

  // 初始化电子贺卡功能
  initEcardCreator();

  // 初始化音乐播放器
  initMusicPlayer();

  // 初始化移动端导航菜单
  initMobileNav();

  // 添加退出登录功能
  initLogout();

  console.log('页面初始化完成');
});

// 获取当前登录用户信息
async function getCurrentUser() {
  // 如果已经超过最大重试次数，直接返回避免无限循环
  if (authRetryCount >= MAX_AUTH_RETRIES) {
    console.error('获取用户信息重试次数过多，请手动刷新页面');
    return null;
  }

  try {
    authRetryCount++; // 增加重试计数
    console.log(`尝试获取用户信息 (尝试 ${authRetryCount}/${MAX_AUTH_RETRIES})`);

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error(`获取用户数据失败: ${response.status}`);
    }

    const userData = await response.json();
    authRetryCount = 0; // 成功后重置计数器
    console.log('获取用户信息成功:', userData);

    // 更新页面上的用户信息
    updateUserInfo(userData);

    return userData;
  } catch (error) {
    console.error('获取用户数据错误:', error);

    // 只有在超过重试次数后才清除认证并重定向
    if (authRetryCount >= MAX_AUTH_RETRIES) {
      console.error('多次尝试后仍然无法获取用户信息，将重定向到登录页面');
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      window.location.href = 'login.html';
    }

    return null;
  }
}

// 更新页面上的用户信息
function updateUserInfo(user) {
  // 添加用户头像和用户名到导航栏
  const navLinks = document.querySelector('.nav-links');

  // 创建用户信息元素（如果不存在）
  if (!document.querySelector('.user-info')) {
    const userInfoElement = document.createElement('div');
    userInfoElement.className = 'user-info flex items-center ml-4';
    userInfoElement.innerHTML = `
      <span class="username text-white mr-2">${user.fullName || user.username}</span>
      <div class="user-avatar">
        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ff79c6&color=fff" 
             alt="用户头像" class="rounded-full w-8 h-8">
        <div class="dropdown-menu">
          <a href="#" id="my-wishlist">我的心愿单</a>
          <a href="#" id="my-messages">我的留言</a>
          <a href="#" id="logout-btn">退出登录</a>
        </div>
      </div>
    `;

    navLinks.appendChild(userInfoElement);

    // 初始化用户下拉菜单
    const userAvatar = userInfoElement.querySelector('.user-avatar');
    const dropdownMenu = userInfoElement.querySelector('.dropdown-menu');

    userAvatar.addEventListener('click', function () {
      dropdownMenu.classList.toggle('show');
    });

    // 点击外部区域关闭下拉菜单
    document.addEventListener('click', function (event) {
      if (!userAvatar.contains(event.target)) {
        dropdownMenu.classList.remove('show');
      }
    });
  }
}

// 添加退出登录功能
function initLogout() {
  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'logout-btn') {
      e.preventDefault();

      // 清除认证相关信息
      localStorage.removeItem('authToken');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginTime');

      // 重定向到登录页面
      window.location.href = 'login.html';
    }
  });
}

// 创建随机心形动画
function createHearts() {
  const heartsContainer = document.querySelector('.hearts-animation');
  if (!heartsContainer) return;

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
      const colors = ['rgba(255, 121, 198, 0.8)', 'rgba(255, 82, 82, 0.8)', 'rgba(255, 255, 255, 0.8)'];
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

// 初始化故事卡片展开功能
function initStoryCards() {
  const storyCards = document.querySelectorAll('.story-card');

  storyCards.forEach(card => {
    const header = card.querySelector('.story-header');
    const content = card.querySelector('.story-content');

    // 初始状态设置
    content.style.maxHeight = '0';

    header.addEventListener('click', () => {
      card.classList.toggle('expanded');

      if (card.classList.contains('expanded')) {
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        content.style.maxHeight = '0';
      }
    });
  });
}

// 初始化移动端导航菜单
function initMobileNav() {
  // 移动端菜单切换
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }
}

// 显示提示消息
function showToast(message) {
  // 检查是否已存在toast元素
  let toast = document.querySelector('.toast-message');

  if (!toast) {
    toast = document.createElement('div');
    toast.classList.add('toast-message');
    document.body.appendChild(toast);
  }

  // 设置消息内容
  toast.textContent = message;
  toast.classList.add('show');

  // 3秒后隐藏
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// 从本地存储加载
function loadFromLocalStorage() {
  try {
    const saved = localStorage.getItem('loveStories');
    if (!saved) return;

    // 解析存储的数据
    const parsedData = JSON.parse(saved);

    // 验证数据是否是数组
    if (!Array.isArray(parsedData)) {
      console.error('本地存储中的故事数据格式不正确');
      return;
    }

    // 数据验证和清理
    stories = parsedData.map(story => {
      // 确保基本字段存在
      if (!story || !story.title) return null;

      return {
        id: story.id || Date.now(), // 如果没有ID，生成一个临时ID
        title: story.title,
        content: story.content || '',
        images: Array.isArray(story.images) ? story.images : [],
        authorName: story.authorName || '匿名用户',
        createdAt: story.createdAt || new Date().toISOString(),
        updatedAt: story.updatedAt || new Date().toISOString()
      };
    }).filter(story => story !== null); // 过滤掉无效记录

    // 如果故事列表不为空，渲染故事
    if (stories.length > 0) {
      renderStories();
    }
  } catch (e) {
    console.error('从本地存储加载故事失败:', e);
    // 清除可能损坏的数据
    localStorage.removeItem('loveStories');
    // 初始化为空数组
    stories = [];
  }
}

// 清理本地存储，避免配额超限
function cleanupLocalStorage() {
  try {
    // 检查本地存储使用情况
    let storageUsed = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        storageUsed += localStorage[key].length * 2; // 字符占用的字节数（近似）
      }
    }

    console.log(`本地存储使用: ${(storageUsed / 1024 / 1024).toFixed(2)} MB`);

    // 如果使用空间超过4MB，清理部分数据
    const maxStorage = 4 * 1024 * 1024; // 4MB
    if (storageUsed > maxStorage) {
      console.warn('本地存储空间过大，正在清理');

      // 1. 清理临时数据
      localStorage.removeItem('tempData');

      // 2. 压缩爱情故事数据
      const savedStories = localStorage.getItem('loveStories');
      if (savedStories) {
        try {
          const stories = JSON.parse(savedStories);
          // 压缩故事数据
          const compressedStories = stories.map(story => ({
            id: story.id,
            title: story.title,
            content: story.content.substring(0, 200) + '...',
            images: story.images ? story.images.slice(0, 1) : [] // 只保留第一张图片
          }));
          localStorage.setItem('loveStories', JSON.stringify(compressedStories));
        } catch (e) {
          console.error('压缩故事数据失败:', e);
          // 如果解析失败，直接删除
          localStorage.removeItem('loveStories');
        }
      }
    }
  } catch (error) {
    console.error('清理本地存储失败:', error);
  }
}

// 初始化音乐播放器
function initMusicPlayer() {
  const musicToggle = document.getElementById('music-toggle');
  const bgm = document.getElementById('bgm');

  if (!musicToggle || !bgm) return;

  musicToggle.addEventListener('click', function () {
    if (bgm.paused) {
      bgm.play().catch(err => {
        console.error('播放音乐失败:', err);
        showToast('播放音乐失败，请点击页面后再试');
      });
      musicToggle.classList.add('playing');
    } else {
      bgm.pause();
      musicToggle.classList.remove('playing');
    }
  });

  // 添加自动播放失败的处理
  document.addEventListener('click', function () {
    if (bgm && bgm.paused && musicToggle.classList.contains('playing')) {
      bgm.play().catch(err => {
        console.error('自动播放音乐失败:', err);
      });
    }
  });
}

// 初始化礼物卡片翻转效果
function initGiftCards() {
  const giftCards = document.querySelectorAll('.gift-card');

  giftCards.forEach(card => {
    card.addEventListener('click', function () {
      this.classList.toggle('flipped');
    });

    // 添加心愿单按钮事件
    const wishlistBtn = card.querySelector('.wishlist-btn');
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', function (e) {
        e.stopPropagation(); // 防止触发卡片翻转
        this.innerHTML = '<i class="fa fa-check"></i> 已加入心愿单';
        this.classList.add('added');
      });
    }
  });
}

// 初始化心形动画
function initHeartsAnimation() {
  const heartsContainer = document.querySelector('.hearts-animation');

  function createHeart() {
    const heart = document.createElement('div');
    heart.classList.add('heart');
    heart.innerHTML = '<i class="fa fa-heart"></i>';

    // 随机位置和大小
    const left = Math.random() * 100;
    const size = Math.random() * 20 + 10;

    heart.style.left = left + 'vw';
    heart.style.fontSize = size + 'px';
    heart.style.animationDuration = Math.random() * 3 + 2 + 's';

    heartsContainer.appendChild(heart);

    // 动画结束后移除
    setTimeout(() => {
      heart.remove();
    }, 5000);
  }

  // 每500ms创建一个心形
  setInterval(createHeart, 500);
}

// 初始化爱情故事的所有功能
function initStoryFeatures() {
  // 从后端加载故事数据
  loadStoriesFromServer();

  // 添加故事按钮点击事件
  const addStoryBtn = document.getElementById('add-story-btn');
  if (addStoryBtn) {
    addStoryBtn.addEventListener('click', function () {
      openStoryModal();
    });
  }

  // 关闭模态窗口的按钮
  document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', function () {
      closeStoryModal();
    });
  });

  // 取消删除按钮
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', function () {
      document.getElementById('delete-confirm').classList.add('hidden');
    });
  }

  // 故事表单提交
  const storyForm = document.getElementById('story-form');
  if (storyForm) {
    storyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      saveStory();
    });
  }

  // 上传图片按钮点击事件
  const uploadBtn = document.getElementById('upload-story-images');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function () {
      document.getElementById('story-images-input').click();
    });
  }

  // 图片选择后的处理
  const imageInput = document.getElementById('story-images-input');
  if (imageInput) {
    imageInput.addEventListener('change', function (e) {
      handleImageUpload(e);
    });
  }

  // 初始化故事卡片的交互功能
  initStoryCardInteractions();

  console.log('爱情故事功能初始化完成');
}

// 初始化故事卡片的交互功能
function initStoryCardInteractions() {
  // 为动态添加的故事卡片绑定事件
  document.addEventListener('click', function (e) {
    // 编辑按钮
    if (e.target.closest('.edit-story')) {
      const btn = e.target.closest('.edit-story');
      const storyId = parseInt(btn.dataset.id);
      editStory(storyId);
    }

    // 删除按钮
    if (e.target.closest('.delete-story')) {
      const btn = e.target.closest('.delete-story');
      const storyId = parseInt(btn.dataset.id);
      confirmDelete(storyId);
    }
  });
}

// 保存到本地存储
function saveToLocalStorage() {
  try {
    // 压缩图片数据，减少本地存储占用
    const compressedStories = stories.map(story => {
      return {
        ...story,
        images: compressImages(story.images || [])
      };
    });

    localStorage.setItem('loveStories', JSON.stringify(compressedStories));
  } catch (e) {
    console.error('保存到本地存储失败:', e);
  }
}

// 从服务器加载所有故事
async function loadStoriesFromServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/stories`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      // 如果API调用失败，则尝试从本地存储加载
      console.warn('无法从服务器加载故事，尝试从本地存储加载');
      loadFromLocalStorage();
      return;
    }

    const data = await response.json();
    // 检查返回数据格式，处理分页数据
    stories = data.content || data;
    renderStories();

  } catch (error) {
    console.error('加载故事失败:', error);
    // 出错时尝试从本地存储加载
    loadFromLocalStorage();
  }
}

// 渲染所有故事卡片
function renderStories() {
  const container = document.querySelector('.stories-container');
  container.innerHTML = '';

  if (stories.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-500 py-8">暂无故事，成为第一个分享爱情故事的人吧！</p>';
    return;
  }

  stories.forEach((story, index) => {
    container.appendChild(createStoryCard(story, index));
  });

  // 初始化所有故事卡片的图片滑动功能
  initImageSliders();
}

// 创建单个故事卡片
function createStoryCard(story, index) {
  const card = document.createElement('div');
  card.className = 'story-card mb-8';
  card.setAttribute('data-aos', 'fade-up');
  if (index > 0) card.setAttribute('data-aos-delay', index * 100);
  card.dataset.storyId = story.id;

  // 确保所有图片路径都是完整URL
  const processedImages = story.images ? story.images.map(img => {
    if (!img) return null; // 跳过空值

    console.log('处理故事图片路径:', img);

    // 如果是相对路径（以/开头）
    if (img && img.startsWith('/')) {
      // 从API_BASE_URL中提取域名部分
      const baseUrlParts = API_BASE_URL.split('/');
      const domainPart = baseUrlParts[0] + '//' + baseUrlParts[2];
      const fullUrl = domainPart + img;
      console.log('转换为完整URL:', fullUrl);
      return fullUrl;
    }

    return img;
  }).filter(img => img !== null) : []; // 过滤掉空值

  let imagesHtml = '';
  if (processedImages && processedImages.length > 0) {
    if (processedImages.length === 1) {
      // 单张图片，添加错误处理
      imagesHtml = `
        <div class="story-image">
          <img src="${processedImages[0]}" alt="${story.title}" class="story-img" 
               onerror="console.error('图片加载失败:' + this.src);">
        </div>`;
    } else {
      // 多张图片 - 滑动展示，添加错误处理
      imagesHtml = `
        <div class="story-images-slider">
          <div class="slider-container">
            ${processedImages.map(img => `
              <div class="slide">
                <img src="${img}" alt="${story.title}" 
                     onerror="console.error('图片加载失败:' + this.src);">
              </div>`).join('')}
          </div>
          <button class="slider-btn prev"><i class="fa fa-chevron-left"></i></button>
          <button class="slider-btn next"><i class="fa fa-chevron-right"></i></button>
          <div class="slider-dots">
            ${processedImages.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}" data-index="${i}"></span>`).join('')}
          </div>
                </div>
            `;
    }
  }

  card.innerHTML = `
    <div class="story-header">
      <h3 class="story-title">${story.title}</h3>
      <div class="story-actions">
        <button class="edit-story" data-id="${story.id}"><i class="fa fa-edit"></i></button>
        <button class="delete-story" data-id="${story.id}"><i class="fa fa-trash"></i></button>
        <i class="fa fa-heart expand-icon"></i>
      </div>
    </div>
    <div class="story-content">
      ${imagesHtml}
      <p>${story.content}</p>
    </div>
  `;

  // 添加编辑按钮事件监听
  card.querySelector('.edit-story').addEventListener('click', function () {
    const storyId = parseInt(this.dataset.id);
    editStory(storyId);
  });

  // 添加删除按钮事件监听
  card.querySelector('.delete-story').addEventListener('click', function () {
    const storyId = parseInt(this.dataset.id);
    confirmDelete(storyId);
  });

  return card;
}

// 初始化所有图片滑动器
function initImageSliders() {
  document.querySelectorAll('.story-images-slider').forEach(slider => {
    const container = slider.querySelector('.slider-container');
    const slides = slider.querySelectorAll('.slide');
    const dots = slider.querySelectorAll('.dot');
    const prevBtn = slider.querySelector('.prev');
    const nextBtn = slider.querySelector('.next');

    if (slides.length <= 1) return;

    let currentIndex = 0;

    // 显示指定索引的滑块
    function showSlide(index) {
      if (index < 0) index = slides.length - 1;
      if (index >= slides.length) index = 0;

      currentIndex = index;
      container.style.transform = `translateX(-${currentIndex * 100}%)`;

      // 更新小圆点状态
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentIndex);
      });
    }

    // 上一张/下一张按钮事件
    prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));

    // 小圆点导航
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => showSlide(index));
    });

    // 触摸滑动支持
    let touchStartX = 0;
    let touchEndX = 0;

    container.addEventListener('touchstart', e => {
      touchStartX = e.changedTouches[0].screenX;
    });

    container.addEventListener('touchend', e => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        showSlide(currentIndex + 1); // 左滑 -> 下一张
      } else if (touchEndX - touchStartX > 50) {
        showSlide(currentIndex - 1); // 右滑 -> 上一张
      }
    });
  });
}

// 打开故事编辑模态窗口
function openStoryModal(story = null) {
  const modal = document.getElementById('story-modal');
  const modalTitle = document.getElementById('story-modal-title');
  const form = document.getElementById('story-form');
  const storyIdInput = document.getElementById('story-id');
  const titleInput = document.getElementById('story-title');
  const contentInput = document.getElementById('story-content');
  const imagesPreview = document.getElementById('story-images-preview');

  // 清除之前的数据
  form.reset();
  imagesPreview.innerHTML = '';

  if (story) {
    // 编辑现有故事
    modalTitle.textContent = '编辑爱情故事';
    storyIdInput.value = story.id;
    titleInput.value = story.title;
    contentInput.value = story.content;

    // 显示现有图片
    if (story.images && story.images.length > 0) {
      story.images.forEach(imagePath => {
        // 确保图片路径是完整URL
        let fullImagePath = imagePath;
        if (imagePath && imagePath.startsWith('/')) {
          const baseUrlParts = API_BASE_URL.split('/');
          const domainPart = baseUrlParts[0] + '//' + baseUrlParts[2];
          fullImagePath = domainPart + imagePath;
        }
        addImagePreview(fullImagePath);
      });
    }
  } else {
    // 添加新故事
    modalTitle.textContent = '添加爱情故事';
    storyIdInput.value = '';
  }

  modal.classList.remove('hidden');
}

// 关闭故事编辑模态窗口
function closeStoryModal() {
  document.getElementById('story-modal').classList.add('hidden');
}

// 编辑故事
async function editStory(storyId) {
  try {
    // 从服务器获取故事详情
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error(`获取故事详情失败: ${response.status}`);
    }

    const story = await response.json();
    openStoryModal(story);
  } catch (error) {
    console.error('获取故事详情失败:', error);

    // 如果API调用失败，则从本地数组获取
    const story = stories.find(s => s.id === storyId);
    if (story) {
      openStoryModal(story);
    } else {
      showToast('无法加载故事详情，请稍后再试');
    }
  }
}

// 确认删除故事
function confirmDelete(storyId) {
  const confirmDialog = document.getElementById('delete-confirm');
  const confirmBtn = document.getElementById('confirm-delete');

  // 移除之前的事件监听
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  // 添加新的事件监听
  newConfirmBtn.addEventListener('click', function () {
    deleteStory(storyId);
    confirmDialog.classList.add('hidden');
  });

  confirmDialog.classList.remove('hidden');
}

// 删除故事
async function deleteStory(storyId) {
  try {
    const response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error(`删除故事失败: ${response.status}`);
    }

    // 从本地数组中移除
    stories = stories.filter(story => story.id !== storyId);

    // 重新渲染故事列表
    renderStories();

    // 显示成功消息
    showToast('故事已成功删除！');
  } catch (error) {
    console.error('删除故事失败:', error);
    showToast('删除故事失败，请稍后再试');

    // 失败时仍然从本地数组移除
    stories = stories.filter(story => story.id !== storyId);
    renderStories();
    saveToLocalStorage();
  }
}

// 保存故事
async function saveStory() {
  const storyIdInput = document.getElementById('story-id');
  const titleInput = document.getElementById('story-title');
  const contentInput = document.getElementById('story-content');
  const imagesPreview = document.getElementById('story-images-preview');

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title) {
    showToast('标题不能为空');
    return;
  }

  try {
    // 检查认证状态，但不自动重定向
    if (!localStorage.getItem('authToken')) {
      showToast('您需要登录才能保存故事，请先登录');
      return;
    }

    // 显示上传进度提示
    showToast('正在处理图片，请稍候...');

    // 处理图片 - 转换base64为文件上传
    const images = [];
    const maxImages = 3; // 限制每个故事最多3张图片
    const previewImages = imagesPreview.querySelectorAll('.preview-image');

    // 依次处理每张图片
    for (let i = 0; i < Math.min(previewImages.length, maxImages); i++) {
      const preview = previewImages[i];
      const path = preview.dataset.path;

      // 如果是base64格式，需要先上传
      if (path && path.startsWith('data:image')) {
        try {
          // 转换base64为文件并上传
          const fileName = `story_image_${Date.now()}_${i}.jpg`;
          const file = await dataURLtoFile(path, fileName);
          console.log('准备上传图片:', fileName, file.type, file.size + ' bytes');

          // 上传图片并获取URL
          const imageUrl = await uploadImage(file);
          console.log('图片上传成功，URL:', imageUrl);
          images.push(imageUrl);
        } catch (err) {
          console.error('图片上传失败:', err);
          // 如果单张图片上传失败，继续处理其他图片
          continue;
        }
      } else if (path) {
        // 如果已经是URL格式，直接使用
        images.push(path);
      }
    }

    let storyDTO = {
      title,
      content,
      images
    };

    console.log('准备保存故事:', storyDTO);
    console.log('认证令牌:', localStorage.getItem('authToken') ? '已设置' : '未设置');

    let response;
    let savedStory;

    if (storyIdInput.value) {
      // 更新现有故事
      const storyId = parseInt(storyIdInput.value);
      response = await fetch(`${API_BASE_URL}/stories/${storyId}`, {
        method: 'PUT',
        headers: getAuthHeader(),
        body: JSON.stringify(storyDTO)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('更新故事失败:', response.status, errorText);
        if (response.status === 401) {
          showToast('登录已过期，请重新登录后再尝试');
          return;
        }
        throw new Error(`更新故事失败: ${response.status} ${errorText}`);
      }

      savedStory = await response.json();
      console.log('故事更新成功:', savedStory);

      // 更新本地数组中的故事
      const storyIndex = stories.findIndex(s => s.id === storyId);
      if (storyIndex !== -1) {
        stories[storyIndex] = savedStory;
      }
    } else {
      // 添加新故事
      response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(storyDTO)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('创建故事失败:', response.status, errorText);
        if (response.status === 401) {
          showToast('登录已过期，请重新登录后再尝试');
          return;
        }
        throw new Error(`创建故事失败: ${response.status} ${errorText}`);
      }

      savedStory = await response.json();
      console.log('故事创建成功:', savedStory);
      stories.push(savedStory);
    }

    // 重新渲染故事列表
    renderStories();

    // 关闭模态窗口
    closeStoryModal();

    // 显示成功消息
    showToast('故事已成功保存！');
  } catch (error) {
    console.error('保存故事失败:', error);
    showToast('保存故事失败，请稍后再试');

    // 如果API调用失败，尝试使用本地存储备份
    const storyId = storyIdInput.value ? parseInt(storyIdInput.value) : null;
    fallbackToLocalStorage(storyId, title, content, []);
  }
}

// 压缩图片数据，减少本地存储占用
function compressImages(images) {
  // 如果图片太多，只保留前3张
  if (images.length > 3) {
    images = images.slice(0, 3);
  }

  // 对于base64格式的图片，可以进行简单替换
  return images.map(img => {
    if (img.startsWith('data:image')) {
      // 替换为占位符或相对路径
      return 'images/placeholder.jpg';
    }
    return img;
  });
}

// 本地存储备份方法
function fallbackToLocalStorage(storyId, title, content, images) {
  if (storyId) {
    // 更新现有故事
    const storyIndex = stories.findIndex(s => s.id === parseInt(storyId));

    if (storyIndex !== -1) {
      stories[storyIndex] = {
        ...stories[storyIndex],
        title,
        content,
        images
      };
    }
  } else {
    // 添加新故事
    const newId = stories.length > 0 ? Math.max(...stories.map(s => s.id)) + 1 : 1;

    stories.push({
      id: newId,
      title,
      content,
      images
    });
  }

  // 保存到本地存储
  saveToLocalStorage();
}

// 处理图片上传
function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  // 图片最大数量限制
  const maxImages = 3;
  const currentCount = document.querySelectorAll('.preview-image').length;
  const remainingSlots = maxImages - currentCount;

  if (remainingSlots <= 0) {
    showToast(`最多只能上传${maxImages}张图片`);
    return;
  }

  // 显示处理中提示
  showToast('正在处理图片，请稍候...');

  // 处理每一个选择的文件，最多处理remainingSlots个
  for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
    const file = files[i];

    // 检查文件类型是否为图片
    if (!file.type.startsWith('image/')) {
      showToast('只能上传图片文件');
      continue;
    }

    // 检查文件大小
    const maxSizeMB = 2; // 降低为2MB，减少数据库压力
    if (file.size > maxSizeMB * 1024 * 1024) {
      showToast(`图片大小不能超过${maxSizeMB}MB，正在压缩...`);

      // 直接读取为文件对象并压缩
      const reader = new FileReader();
      reader.onload = function (e) {
        compressImage(e.target.result, 800, 0.6, function (compressedDataUrl) {
          addImagePreview(compressedDataUrl, true);
        });
      };
      reader.readAsDataURL(file);
    } else {
      // 小于限制大小的图片直接读取
      const reader = new FileReader();
      reader.onload = function (e) {
        addImagePreview(e.target.result, true);
      };
      reader.readAsDataURL(file);
    }
  }

  // 清除input，允许选择相同的文件
  event.target.value = '';
}

// 压缩图片
function compressImage(dataURL, maxWidth, quality, callback) {
  const img = new Image();
  img.onload = function () {
    // 创建画布
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // 限制最大宽度，最大不超过800px
    const absoluteMaxWidth = 800;
    maxWidth = Math.min(maxWidth, absoluteMaxWidth);

    // 如果宽度大于最大宽度，等比例缩小
    if (width > maxWidth) {
      height = Math.round(height * maxWidth / width);
      width = maxWidth;
    }

    // 降低所有图片的质量
    quality = Math.min(quality, 0.7); // 最高质量限制为0.7

    // 大于500KB的图片进一步压缩
    if (dataURL.length > 512 * 1024) {
      // 进一步降低质量
      quality = Math.min(quality, 0.5);

      // 进一步限制尺寸
      const reductionFactor = 0.75;
      width = Math.round(width * reductionFactor);
      height = Math.round(height * reductionFactor);
    }

    // 大于1MB的图片强力压缩
    if (dataURL.length > 1024 * 1024) {
      // 大幅降低质量
      quality = Math.min(quality, 0.3);

      // 大幅降低尺寸
      const reductionFactor = 0.5;
      width = Math.round(width * reductionFactor);
      height = Math.round(height * reductionFactor);
    }

    canvas.width = width;
    canvas.height = height;

    // 绘制图像
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // 导出为dataURL，使用JPEG格式并应用压缩质量
    const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
    callback(compressedDataURL);
  };
  img.src = dataURL;
}

// 添加图片预览
function addImagePreview(imagePath, isNew = false) {
  const previewContainer = document.getElementById('story-images-preview');

  // 确保图片路径是完整URL
  let displayPath = imagePath;
  let storedPath = imagePath; // 存储的路径，可能是相对路径

  // 如果是编辑模式下的已有图片（非新上传），尝试转换为相对路径存储
  if (!isNew && imagePath.includes('/uploads/')) {
    const baseUrlParts = API_BASE_URL.split('/');
    const domainPart = baseUrlParts[0] + '//' + baseUrlParts[2];
    if (imagePath.startsWith(domainPart)) {
      storedPath = imagePath.replace(domainPart, '');
    }
  }

  // 创建预览元素
  const previewDiv = document.createElement('div');
  previewDiv.className = 'preview-image relative';
  previewDiv.dataset.path = storedPath; // 存储可能是相对路径的原始值

  previewDiv.innerHTML = `
    <img src="${displayPath}" alt="预览" class="w-24 h-24 object-cover rounded">
    <button type="button" class="remove-image absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
      <i class="fa fa-times"></i>
    </button>
  `;

  // 添加删除按钮事件
  previewDiv.querySelector('.remove-image').addEventListener('click', function () {
    previewDiv.remove();
  });

  previewContainer.appendChild(previewDiv);
}

// 初始化电子贺卡功能
function initEcardCreator() {
  // 加载在线贺卡模板
  fetchEcardTemplates();

  // 添加贺卡模板相关的CSS样式
  if (!document.getElementById('ecard-template-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'ecard-template-styles';
    styleElement.textContent = `
      .templates-container {
        margin: 15px 0;
      }
      
      .template-item {
        border: 2px solid transparent;
        border-radius: 8px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .template-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      }
      
      .template-item.active {
        border-color: #ff79c6;
        box-shadow: 0 0 0 2px rgba(255, 121, 198, 0.3);
      }
      
      .template-item img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
      }
      
      .template-loading {
        grid-column: 1 / -1;
        padding: 20px;
        text-align: center;
        color: #888;
      }
      
      .template-error {
        grid-column: 1 / -1;
        padding: 20px;
        text-align: center;
        color: #f44336;
      }
      
      .ecard-image {
        margin: 20px 0;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      
      .ecard-image img {
        width: 100%;
        height: auto;
        display: block;
      }
      
      .upload-overlay {
        position: relative;
        text-align: center;
        padding: 15px;
        border: 2px dashed #ddd;
        border-radius: 8px;
        margin: 15px 0;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .upload-overlay:hover {
        border-color: #ff79c6;
        background-color: rgba(255, 121, 198, 0.05);
      }
      
      .upload-overlay i {
        font-size: 24px;
        color: #ff79c6;
        margin-bottom: 5px;
      }
    `;
    document.head.appendChild(styleElement);
  }

  const templateItems = document.querySelectorAll('.template-item');
  const uploadOverlay = document.querySelector('.upload-overlay');
  const fileInput = document.getElementById('card-image');
  const cardImage = document.querySelector('.ecard-image img');
  const cardMessage = document.getElementById('card-message');
  const sendButton = document.querySelector('.send-btn');

  // 自定义发件邮箱相关元素
  const useCustomSender = document.getElementById('use-custom-sender');
  const customSenderFields = document.getElementById('custom-sender-fields');

  // 切换自定义发件人选项
  if (useCustomSender) {
    useCustomSender.addEventListener('change', function () {
      if (this.checked) {
        customSenderFields.style.display = 'block';
      } else {
        customSenderFields.style.display = 'none';
      }
    });
  }

  // 选择模板
  templateItems.forEach(item => {
    item.addEventListener('click', () => {
      templateItems.forEach(t => t.classList.remove('active'));
      item.classList.add('active');

      // 更新预览图像
      const templateImg = item.querySelector('img').src;
      cardImage.src = templateImg;
    });
  });

  // 上传自定义图片
  if (uploadOverlay && fileInput) {
    uploadOverlay.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', event => {
      const file = event.target.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = e => {
          cardImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // 发送电子贺卡
  if (sendButton) {
    sendButton.addEventListener('click', async () => {
      const recipientEmail = document.querySelector('.ecard-send-form input[type="email"]').value;
      const senderName = document.querySelector('.ecard-send-form input[type="text"]').value;
      const message = cardMessage.value;
      const activeTemplate = document.querySelector('.template-item.active');

      if (!recipientEmail || !senderName || !message) {
        alert('请填写所有必填字段！');
        return;
      }

      // 检查自定义发件人选项
      let useCustom = useCustomSender && useCustomSender.checked;
      if (useCustom) {
        const senderEmail = document.getElementById('sender-email').value;
        const senderPassword = document.getElementById('sender-password').value;

        if (!senderEmail || !senderPassword) {
          alert('如果选择使用自定义发件人，请填写发件邮箱和密码！');
          return;
        }
      }

      try {
        // 显示处理提示
        showToast('正在处理贺卡，请稍候...');

        // 准备贺卡数据
        const ecardData = {
          recipientEmail: recipientEmail,
          senderName: senderName,
          message: message,
          templateId: activeTemplate ? activeTemplate.dataset.templateId : 'template1',
          imageUrl: cardImage.src
        };

        // 添加自定义发件人信息
        if (useCustom) {
          ecardData.useCustomSender = true;
          ecardData.senderEmail = document.getElementById('sender-email').value;
          ecardData.senderEmailPassword = document.getElementById('sender-password').value;

          // 根据邮箱类型设置SMTP服务器信息
          if (ecardData.senderEmail.endsWith('@qq.com')) {
            ecardData.senderEmailHost = 'smtp.qq.com';
            ecardData.senderEmailPort = 465;
          } else if (ecardData.senderEmail.endsWith('@163.com')) {
            ecardData.senderEmailHost = 'smtp.163.com';
            ecardData.senderEmailPort = 465;
          } else if (ecardData.senderEmail.endsWith('@gmail.com')) {
            ecardData.senderEmailHost = 'smtp.gmail.com';
            ecardData.senderEmailPort = 587;
          }
        }

        // 发送贺卡数据到后端
        await sendEcard(ecardData);

        // 显示成功消息
        showToast('贺卡已成功发送！');

        // 清空表单
        document.querySelector('.ecard-send-form input[type="email"]').value = '';
        document.querySelector('.ecard-send-form input[type="text"]').value = '';
        cardMessage.value = '';

        if (useCustom) {
          document.getElementById('sender-email').value = '';
          document.getElementById('sender-password').value = '';
          useCustomSender.checked = false;
          customSenderFields.style.display = 'none';
        }
      } catch (error) {
        console.error('Send ecard error:', error);
        alert('发送贺卡失败，请稍后再试');
      }
    });
  }
}

// 获取在线贺卡模板
async function fetchEcardTemplates() {
  const templatesContainer = document.querySelector('.templates-container');
  if (!templatesContainer) return;

  // 清空现有模板
  templatesContainer.innerHTML = '';

  // 显示加载状态
  const loadingTemplate = document.createElement('div');
  loadingTemplate.className = 'template-loading';
  loadingTemplate.innerHTML = '<p>正在加载模板...</p>';
  templatesContainer.appendChild(loadingTemplate);

  try {
    // 使用本地图片路径，避免外部图片加载失败
    const templates = [
      {
        url: 'images/cards/card1.png',
        alt: '情人节红色爱心模板'
      },
      {
        url: 'images/cards/card2.png',
        alt: '浪漫粉色情人节模板'
      },
      {
        url: 'images/cards/card3.png',
        alt: '爱心花束情人节模板'
      },
      {
        url: 'images/cards/card4.png',
        alt: '烛光晚餐情人节模板'
      },
      {
        url: 'images/cards/card5.png',
        alt: '玫瑰花情人节模板'
      },
      {
        url: 'images/cards/card6.png',
        alt: '礼物盒情人节模板'
      }
    ];

    // 移除加载状态
    templatesContainer.removeChild(loadingTemplate);

    // 创建模板项
    templates.forEach((template, index) => {
      const templateItem = document.createElement('div');
      templateItem.className = 'template-item' + (index === 0 ? ' active' : '');
      templateItem.dataset.templateId = `template${index + 1}`;

      // 添加图片
      const img = document.createElement('img');
      img.src = template.url;
      img.alt = template.alt;
      img.onerror = function () {
        this.onerror = null;
        // 使用内嵌的SVG作为备用图像，避免再次加载失败
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMzMyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMzMyIgZmlsbD0iI2ZmZTZmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmaWxsPSIjZmY3OWM2Ij7mmoLml6DliqDovb3mqKHnpLog5Zu+54mH5LiN5Y+v6IO9PC90ZXh0Pjwvc3ZnPg==';
      };

      templateItem.appendChild(img);
      templatesContainer.appendChild(templateItem);

      // 添加点击事件
      templateItem.addEventListener('click', function () {
        document.querySelectorAll('.template-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        // 更新预览图像
        const cardImage = document.querySelector('.ecard-image img');
        if (cardImage) {
          cardImage.src = img.src;
        }
      });
    });

    // 确保选择了第一个模板
    const firstTemplate = templatesContainer.querySelector('.template-item');
    if (firstTemplate) {
      firstTemplate.classList.add('active');

      // 更新预览图像
      const cardImage = document.querySelector('.ecard-image img');
      if (cardImage) {
        const firstImg = firstTemplate.querySelector('img');
        cardImage.src = firstImg.src;
      }
    }

  } catch (error) {
    console.error('获取贺卡模板失败:', error);
    templatesContainer.innerHTML = '<div class="template-error">加载模板失败，请刷新重试</div>';
  }
}

// 发送电子贺卡
async function sendEcard(ecardData) {
  try {
    // 如果图片是Data URL，需要将其转换为文件并上传
    if (ecardData.imageUrl.startsWith('data:')) {
      const imageFile = await dataURLtoFile(ecardData.imageUrl, 'card-image.png');
      const imageUrl = await uploadImage(imageFile);
      ecardData.imageUrl = imageUrl;
    }
    // 如果图片是外部URL，也需要先下载并上传到自己的服务器
    else if (ecardData.imageUrl.startsWith('http')) {
      try {
        // 创建一个临时img元素来加载图片
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        // 使用Promise等待图片加载
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = ecardData.imageUrl;
        });

        // 将图片绘制到canvas上，转换为blob
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 转换为Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));

        // 创建文件对象并上传
        const file = new File([blob], 'template-image.jpg', { type: 'image/jpeg' });
        const uploadedUrl = await uploadImage(file);
        ecardData.imageUrl = uploadedUrl;
      } catch (error) {
        console.error('处理外部图片URL失败:', error);
        // 如果处理失败，使用默认图片
        ecardData.imageUrl = '/uploads/default-card.jpg';
      }
    }

    // 1. 首先创建贺卡
    const createResponse = await fetch(`${API_BASE_URL}/ecards`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(ecardData)
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create ecard');
    }

    // 2. 获取创建的贺卡ID并发送它
    const createdCard = await createResponse.json();
    const sendResponse = await fetch(`${API_BASE_URL}/ecards/${createdCard.id}/send`, {
      method: 'POST',
      headers: getAuthHeader()
    });

    if (!sendResponse.ok) {
      throw new Error('Failed to send ecard');
    }

    return createdCard;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 上传图片
async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    console.log('开始上传图片:', file.name, file.type, file.size + ' bytes');

    // 确保API_BASE_URL正确
    console.log('上传URL:', `${API_BASE_URL}/upload`);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('图片上传失败:', response.status, errorText);
      throw new Error(`上传失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('图片上传成功，服务器返回:', result);

    // 确保URL是完整的HTTP URL而不是相对路径
    let imageUrl = result.url;

    // 如果返回的是相对路径（以/开头），则添加域名部分
    if (imageUrl && imageUrl.startsWith('/')) {
      // 从API_BASE_URL中提取域名部分
      const baseUrlParts = API_BASE_URL.split('/');
      const domainPart = baseUrlParts[0] + '//' + baseUrlParts[2];
      imageUrl = domainPart + imageUrl;
      console.log('转换为完整URL:', imageUrl);
    }

    return imageUrl;
  } catch (error) {
    console.error('API调用失败:', error);
    throw error;
  }
}

// 将Data URL转换为文件对象
function dataURLtoFile(dataurl, filename) {
  try {
    // 检查dataurl是否有效
    if (!dataurl || typeof dataurl !== 'string' || !dataurl.startsWith('data:')) {
      console.error('无效的Data URL');
      throw new Error('无效的Data URL');
    }

    // 解析Data URL
    const arr = dataurl.split(',');
    if (arr.length < 2) {
      console.error('Data URL格式错误');
      throw new Error('Data URL格式错误');
    }

    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const file = new File([u8arr], filename, { type: mime });
    console.log('Data URL转换为文件成功:', filename, mime, file.size + ' bytes');
    return file;
  } catch (error) {
    console.error('Data URL转换为文件失败:', error);
    throw error;
  }
}

// 初始化移动端导航菜单
function initMobileNav() {
  // 移动端菜单切换
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      navToggle.classList.toggle('active');
    });
  }
}

// 添加toast样式
document.head.insertAdjacentHTML('beforeend', `
<style>
.toast-message {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background-color: rgba(44, 44, 44, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 30px;
    font-size: 1rem;
    z-index: 10000;
    opacity: 0;
    transition: all 0.3s ease;
}

.toast-message.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
}
</style>
`);

// 初始化留言墙功能
function initMessageWall() {
  // 首先加载留言数据
  loadMessages();

  const messageForm = document.getElementById('message-form');
  const messagesContainer = document.querySelector('.messages-container');

  if (messageForm) {
    messageForm.addEventListener('submit', async event => {
      event.preventDefault();

      const nameInput = messageForm.querySelector('input');
      const messageInput = messageForm.querySelector('textarea');

      if (nameInput.value.trim() === '' || messageInput.value.trim() === '') {
        alert('请填写您的名字和留言内容！');
        return;
      }

      try {
        // 调用API保存留言
        const message = await saveMessage(nameInput.value, messageInput.value);

        // 创建新的留言气泡
        const newBubble = createMessageElement(message);

        // 添加到容器的开头
        messagesContainer.prepend(newBubble);

        // 重新初始化该元素的AOS动画
        AOS.refresh();

        // 清空表单
        nameInput.value = '';
        messageInput.value = '';
      } catch (error) {
        console.error('Save message error:', error);
        alert('保存留言失败，请稍后再试');
      }
    });
  }
}

// 加载留言列表
async function loadMessages() {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = await response.json();
    // 检查返回数据格式，处理分页数据
    const messages = data.content || data;

    // 清空现有留言
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '';

    // 添加留言
    if (Array.isArray(messages)) {
      messages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
      });
    } else {
      console.error('收到的留言数据不是数组格式:', data);
    }

    // 初始化点赞和回复功能
    initMessageInteractions();
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

// 创建留言元素
function createMessageElement(message) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message-card');
  messageElement.setAttribute('data-aos', 'fade-up');
  messageElement.setAttribute('data-id', message.id);

  messageElement.innerHTML = `
    <div class="card-header">
      <div class="user-info">
        <div class="avatar">
          ${message.authorName.charAt(0).toUpperCase()}
        </div>
        <span class="author-name">${message.authorName}</span>
      </div>
      <div class="message-likes">
        <i class="fa fa-heart"></i> <span>${message.likeCount || 0}</span>
      </div>
    </div>
    <div class="card-body">
      <p class="message-content">${message.content}</p>
    </div>
    <div class="card-footer">
      <button class="like-btn" data-count="${message.likeCount || 0}"><i class="fa fa-heart"></i> 喜欢</button>
      <button class="reply-btn"><i class="fa fa-reply"></i> 回复</button>
    </div>
    <div class="message-replies hidden"></div>
    <div class="reply-form hidden">
      <textarea placeholder="写下你的回复..." class="reply-textarea"></textarea>
      <button class="send-reply-btn">发送</button>
    </div>
  `;

  // 添加样式到document.head
  if (!document.getElementById('message-card-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'message-card-styles';
    styleElement.textContent = `
      .messages-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 20px;
        padding: 20px;
      }
      
      .message-card {
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        overflow: hidden;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
        display: flex;
        flex-direction: column;
      }
      
      .message-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 15px rgba(0, 0, 0, 0.15);
      }
      
      .card-header {
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f0f0f0;
        background-color: #fff5f7;
      }
      
      .user-info {
        display: flex;
        align-items: center;
      }
      
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #ff79c6;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: bold;
        margin-right: 10px;
      }
      
      .author-name {
        font-weight: 500;
      }
      
      .message-likes {
        color: #ff79c6;
        font-weight: 500;
      }
      
      .card-body {
        padding: 20px;
        flex-grow: 1;
      }
      
      .message-content {
        margin: 0;
        line-height: 1.6;
        color: #333;
      }
      
      .card-footer {
        padding: 12px 15px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
      }
      
      .like-btn, .reply-btn {
        background: none;
        border: none;
        color: #777;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 5px;
        transition: all 0.2s ease;
        font-size: 0.9rem;
      }
      
      .like-btn:hover, .reply-btn:hover {
        background-color: #fff5f7;
        color: #ff79c6;
      }
      
      .like-btn.liked {
        color: #ff79c6;
      }
      
      .reply-form {
        padding: 15px;
        border-top: 1px solid #f0f0f0;
      }
      
      .reply-textarea {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        resize: none;
        margin-bottom: 10px;
        min-height: 60px;
      }
      
      .send-reply-btn {
        background-color: #ff79c6;
        color: white;
        border: none;
        padding: 8px 15px;
        border-radius: 5px;
        cursor: pointer;
        float: right;
        font-weight: 500;
      }
      
      .message-replies {
        padding: 0 15px 15px;
        background-color: #f9f9f9;
      }
      
      .replies-header {
        padding: 10px 0;
        border-bottom: 1px solid #eee;
        margin-bottom: 10px;
      }
      
      .replies-header h4 {
        margin: 0;
        font-size: 14px;
        color: #666;
      }
      
      .message-reply {
        background-color: white;
        padding: 10px;
        margin-top: 10px;
        border-radius: 5px;
        border-left: 3px solid #ff79c6;
      }
      
      .reply-content {
        margin: 0 0 5px;
        font-size: 14px;
      }
      
      .reply-info {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #888;
      }
      
      .reply-author {
        font-weight: 500;
      }
      
      .reply-time {
        color: #999;
      }
    `;
    document.head.appendChild(styleElement);
  }

  return messageElement;
}

// 初始化留言互动功能
function initMessageInteractions() {
  // 点赞功能
  document.querySelectorAll('.like-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const messageElement = button.closest('.message-card');
      const messageId = messageElement.getAttribute('data-id');
      const likesDisplay = messageElement.querySelector('.message-likes span');
      let count = parseInt(button.getAttribute('data-count') || '0');

      if (button.classList.contains('liked')) {
        // 取消点赞
        button.classList.remove('liked');
        count--;
      } else {
        // 添加点赞
        button.classList.add('liked');
        count++;

        // 发送点赞请求到后端
        try {
          await likeMessage(messageId);
        } catch (error) {
          console.error('Like message error:', error);
          // 如果失败，回滚UI变化
          button.classList.remove('liked');
          count--;
        }
      }

      // 更新按钮上的数据属性
      button.setAttribute('data-count', count.toString());

      // 更新顶部显示的点赞数
      if (likesDisplay) {
        likesDisplay.textContent = count;
      }
    });
  });

  // 回复功能
  document.querySelectorAll('.reply-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const messageElement = button.closest('.message-card');
      const replyForm = messageElement.querySelector('.reply-form');
      const messageId = messageElement.getAttribute('data-id');

      // 切换回复表单显示状态
      replyForm.classList.toggle('hidden');

      // 如果显示表单，加载回复
      if (!replyForm.classList.contains('hidden')) {
        loadReplies(messageId, messageElement);
      }
    });
  });

  // 发送回复
  document.querySelectorAll('.send-reply-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const messageElement = button.closest('.message-card');
      const messageId = messageElement.getAttribute('data-id');
      const replyTextarea = messageElement.querySelector('.reply-textarea');
      const content = replyTextarea.value.trim();

      if (!content) {
        alert('请输入回复内容');
        return;
      }

      try {
        const reply = await saveReply(messageId, content);

        // 添加新回复到列表
        const repliesContainer = messageElement.querySelector('.message-replies');
        repliesContainer.classList.remove('hidden');

        // 如果是第一条回复，添加回复标题
        if (!repliesContainer.querySelector('.replies-header')) {
          const replyHeader = document.createElement('div');
          replyHeader.className = 'replies-header';
          replyHeader.innerHTML = `<h4>回复 (1)</h4>`;
          repliesContainer.appendChild(replyHeader);
        } else {
          // 更新回复数量
          const countElement = repliesContainer.querySelector('.replies-header h4');
          if (countElement) {
            const currentCount = parseInt(countElement.textContent.match(/\d+/) || '0') + 1;
            countElement.textContent = `回复 (${currentCount})`;
          }
        }

        const replyElement = document.createElement('div');
        replyElement.className = 'message-reply';
        replyElement.innerHTML = `
          <p class="reply-content">${reply.content}</p>
          <div class="reply-info">
            <span class="reply-author">${reply.authorName}</span>
            <span class="reply-time">${formatDate(reply.createdAt)}</span>
          </div>
        `;

        repliesContainer.appendChild(replyElement);

        // 清空输入框
        replyTextarea.value = '';
      } catch (error) {
        console.error('Save reply error:', error);
        alert('发送回复失败，请稍后再试');
      }
    });
  });
}

// 加载留言回复
async function loadReplies(messageId, messageElement) {
  const repliesContainer = messageElement.querySelector('.message-replies');

  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/replies`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch replies');
    }

    const replies = await response.json();

    // 清空现有回复
    repliesContainer.innerHTML = '';

    if (replies.length > 0) {
      repliesContainer.classList.remove('hidden');

      // 添加回复标题
      const replyHeader = document.createElement('div');
      replyHeader.className = 'replies-header';
      replyHeader.innerHTML = `<h4>回复 (${replies.length})</h4>`;
      repliesContainer.appendChild(replyHeader);

      // 添加回复
      replies.forEach(reply => {
        const replyElement = document.createElement('div');
        replyElement.className = 'message-reply';
        replyElement.innerHTML = `
          <p class="reply-content">${reply.content}</p>
          <div class="reply-info">
            <span class="reply-author">${reply.authorName}</span>
            <span class="reply-time">${formatDate(reply.createdAt)}</span>
          </div>
        `;

        repliesContainer.appendChild(replyElement);
      });
    }
  } catch (error) {
    console.error('Error loading replies:', error);
  }
}

// 保存留言
async function saveMessage(authorName, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        authorName: authorName,
        content: content
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save message');
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 点赞留言
async function likeMessage(messageId) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/like`, {
      method: 'POST',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error('Failed to like message');
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 保存回复
async function saveReply(messageId, content) {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${messageId}/replies`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({
        content: content
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save reply');
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 初始化礼物心愿单功能
function initWishlist() {
  // 加载礼物数据
  loadGifts();

  // 添加礼物卡片翻转效果
  document.querySelectorAll('.gift-card').forEach(card => {
    card.addEventListener('click', function () {
      this.classList.toggle('flipped');
    });
  });

  // 添加到心愿单按钮事件
  document.addEventListener('click', async function (e) {
    if (e.target.closest('.wishlist-btn')) {
      e.stopPropagation(); // 防止触发卡片翻转
      const btn = e.target.closest('.wishlist-btn');
      const giftCard = btn.closest('.gift-card');

      if (!giftCard) {
        console.error('无法找到礼物卡片元素');
        showToast('操作失败，请稍后再试');
        return;
      }

      // 尝试多种方式获取礼物ID
      let giftId = parseInt(giftCard.getAttribute('data-id'));

      // 如果data-id不存在或无效，尝试从按钮的data-gift-id属性获取
      if (!giftId || isNaN(giftId)) {
        giftId = parseInt(btn.getAttribute('data-gift-id'));
      }

      // 如果仍然无效，尝试从礼物名称生成一个唯一ID
      if (!giftId || isNaN(giftId)) {
        const giftName = giftCard.querySelector('.gift-name')?.textContent ||
          giftCard.querySelector('h3')?.textContent;
        if (giftName) {
          // 使用礼物名称的哈希值作为ID
          giftId = Math.abs(giftName.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0));
        } else {
          // 最后的备选方案：生成一个随机ID
          giftId = Math.floor(Math.random() * 10000) + 1;
        }

        // 将生成的ID保存到卡片元素上以便后续使用
        giftCard.setAttribute('data-id', giftId);
      }

      console.log('礼物卡片元素:', giftCard);
      console.log('获取到的礼物ID:', giftId);

      if (!giftId) {
        console.error('礼物ID不存在');
        showToast('操作失败，请稍后再试');
        return;
      }

      try {
        if (btn.classList.contains('added')) {
          // 已经添加过，现在移除
          // 获取心愿单项目ID
          const wishlistItemId = btn.getAttribute('data-wishlist-id');
          if (!wishlistItemId) {
            console.error('心愿单项目ID不存在');
            showToast('操作失败，请稍后再试');
            return;
          }

          const success = await removeFromWishlist(wishlistItemId);
          if (success) {
            btn.innerHTML = '<i class="fa fa-heart-o"></i> 加入心愿单';
            btn.classList.remove('added');
            btn.removeAttribute('data-wishlist-id');
          }
        } else {
          // 添加到心愿单
          console.log('准备添加礼物到心愿单，ID:', giftId);
          const success = await addToWishlist(giftId);
          if (success) {
            btn.innerHTML = '<i class="fa fa-check"></i> 已加入心愿单';
            btn.classList.add('added');

            // 尝试获取最新添加的心愿单项目ID
            await updateWishlistItemIds();
          }
        }
      } catch (error) {
        console.error('心愿单操作失败:', error);
        showToast('操作失败，请稍后再试');
      }
    }
  });
}

// 更新心愿单项目ID
async function updateWishlistItemIds() {
  try {
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error('获取心愿单失败');
    }

    const wishlist = await response.json();

    // 更新所有礼物按钮的心愿单项目ID
    document.querySelectorAll('.wishlist-btn.added').forEach(btn => {
      const giftCard = btn.closest('.gift-card');
      if (!giftCard) return;

      const giftId = giftCard.getAttribute('data-id');
      if (!giftId) return;

      // 查找对应的心愿单项目
      const wishlistItem = wishlist.find(item => {
        const cardName = giftCard.querySelector('.gift-name')?.textContent;
        return item.name === cardName;
      });

      if (wishlistItem) {
        btn.setAttribute('data-wishlist-id', wishlistItem.id);
      }
    });

    return true;
  } catch (error) {
    console.error('更新心愿单项目ID失败:', error);
    return false;
  }
}

// 加载礼物数据
async function loadGifts() {
  try {
    console.log('加载礼物数据，使用默认数据');
    // 直接使用默认礼物数据，不再尝试从API获取
    renderDefaultGiftCards();

    // 如果用户已登录，标记已添加到心愿单的礼物
    if (localStorage.getItem('authToken')) {
      markWishlistedItems();
    }
  } catch (error) {
    console.error('Error loading gifts:', error);
    // 加载失败时使用默认数据
    renderDefaultGiftCards();
  }
}

// 渲染礼物卡片
function renderGiftCards(gifts) {
  const container = document.querySelector('.gifts-container');
  if (!container) return;

  container.innerHTML = '';

  gifts.forEach((gift, index) => {
    // 确保gift.id是有效的数字
    const giftId = gift.id || index + 1;

    const card = document.createElement('div');
    card.className = 'gift-card';
    card.setAttribute('data-aos', 'fade-up');
    if (index > 0) card.setAttribute('data-aos-delay', (index % 3) * 100);
    card.setAttribute('data-id', giftId);

    console.log(`创建礼物卡片 #${index}，ID: ${giftId}，名称: ${gift.name}`);

    card.innerHTML = `
      <div class="gift-front">
        <img src="${gift.imageUrl}" alt="${gift.name}" class="gift-image">
        <h3 class="gift-name">${gift.name}</h3>
        <p class="gift-price">¥${gift.price.toFixed(2)}</p>
      </div>
      <div class="gift-back">
        <h3>${gift.name}</h3>
        <p class="gift-description">${gift.description || '暂无描述'}</p>
        <div class="gift-actions">
          <a href="${gift.purchaseUrl || '#'}" target="_blank" class="buy-btn">购买链接</a>
          <button class="wishlist-btn" data-gift-id="${giftId}"><i class="fa fa-heart-o"></i> 加入心愿单</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  // 初始化卡片翻转效果
  document.querySelectorAll('.gift-card').forEach(card => {
    card.addEventListener('click', function () {
      this.classList.toggle('flipped');
    });
  });

  // 如果用户已登录，标记已添加到心愿单的礼物
  if (localStorage.getItem('authToken')) {
    markWishlistedItems();
  }
}

// 渲染默认礼物卡片
function renderDefaultGiftCards() {
  const defaultGifts = [
    {
      id: 1,
      name: '定制情侣项链',
      price: 299,
      description: '这款定制项链，将你们的名字刻在一起，让爱永恒闪耀',
      imageUrl: 'images/gifts/gift1.webp',
      purchaseUrl: 'https://example.com/necklace'
    },
    {
      id: 2,
      name: '永生玫瑰礼盒',
      price: 399,
      description: '精选永生玫瑰，象征永不凋零的爱情，浪漫与美丽常伴',
      imageUrl: 'images/gifts/gift2.jpg',
      purchaseUrl: 'https://example.com/roses'
    },
    {
      id: 3,
      name: '定制爱情相册',
      price: 199,
      description: '记录你们的美好瞬间，每一页都承载着甜蜜回忆',
      imageUrl: 'images/gifts/gift3.jpg',
      purchaseUrl: 'https://example.com/album'
    }
  ];

  renderGiftCards(defaultGifts);
}

// 添加到心愿单
async function addToWishlist(giftId) {
  try {
    console.log('添加到心愿单，礼物ID:', giftId);

    if (!giftId || isNaN(giftId)) {
      console.error('无效的礼物ID:', giftId);
      showToast('无效的礼物ID，无法添加到心愿单');
      return false;
    }

    if (!localStorage.getItem('authToken')) {
      // 未登录时提示用户
      showToast('请先登录后再添加心愿单');

      // 延迟跳转到登录页面
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);

      return false;
    }

    // 首先获取礼物详情
    const gift = await getGiftDetails(giftId);
    if (!gift) {
      throw new Error('无法获取礼物详情');
    }

    console.log('获取到的礼物详情:', gift);

    // 确保礼物名称有效
    if (!gift.name || gift.name === '未知礼物') {
      console.error('礼物名称无效:', gift.name);

      // 尝试从DOM中直接获取礼物名称
      const giftCard = document.querySelector(`.gift-card[data-id="${giftId}"]`);
      if (giftCard) {
        const nameElement = giftCard.querySelector('.gift-name') || giftCard.querySelector('h3');
        if (nameElement && nameElement.textContent) {
          gift.name = nameElement.textContent.trim();
          console.log('从DOM中获取到礼物名称:', gift.name);
        }
      }

      // 如果仍然无效，使用ID作为名称
      if (!gift.name || gift.name === '未知礼物') {
        gift.name = `礼物${giftId}`;
        console.log('使用默认名称:', gift.name);
      }
    }

    // 创建心愿单项目对象
    const wishlistItem = {
      name: gift.name,
      price: gift.price,
      description: gift.description || '暂无描述',
      imageUrl: gift.imageUrl || 'images/gifts/default.jpg'
    };

    console.log('准备添加到心愿单:', wishlistItem);

    // 发送到正确的API端点
    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wishlistItem)
    });

    console.log('心愿单API响应状态:', response.status);

    // 获取响应文本
    const responseText = await response.text();
    console.log('心愿单API响应内容:', responseText);

    // 尝试解析JSON，如果不是JSON则使用原始文本
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (!response.ok) {
      // 处理401错误，但不自动重定向
      if (response.status === 401) {
        console.error('认证失败，无法添加到心愿单');
        showToast('登录已过期，请重新登录后再试');
        return false;
      }

      // 处理409冲突（礼物已存在）
      if (response.status === 409 || (responseText && responseText.includes('该礼物已在心愿单中'))) {
        console.log('礼物已在心愿单中');
        showToast('该礼物已在心愿单中');

        // 标记按钮为已添加状态
        const btn = document.querySelector(`.gift-card[data-id="${giftId}"] .wishlist-btn`);
        if (btn) {
          btn.innerHTML = '<i class="fa fa-check"></i> 已加入心愿单';
          btn.classList.add('added');
        }
        return true; // 返回true，因为从用户角度看这是成功的
      }

      throw new Error(`添加到心愿单失败: ${response.status} ${responseText}`);
    }

    console.log('添加心愿单成功，服务器返回:', responseData);

    showToast('已成功添加到心愿单');

    // 标记按钮为已添加状态
    const btn = document.querySelector(`.gift-card[data-id="${giftId}"] .wishlist-btn`);
    if (btn) {
      btn.innerHTML = '<i class="fa fa-check"></i> 已加入心愿单';
      btn.classList.add('added');

      // 如果响应中包含ID，保存它用于后续操作
      if (responseData && responseData.id) {
        btn.setAttribute('data-wishlist-id', responseData.id);
      }
    }

    return true;
  } catch (error) {
    console.error('Add to wishlist error:', error);
    showToast('添加心愿单失败，请稍后再试');
    return false;
  }
}

// 从心愿单移除
async function removeFromWishlist(wishlistItemId) {
  try {
    if (!localStorage.getItem('authToken')) {
      showToast('请先登录后再操作');
      return false;
    }

    console.log('准备从心愿单移除项目:', wishlistItemId);

    // 发送到正确的API端点
    const response = await fetch(`${API_BASE_URL}/wishlist/${wishlistItemId}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      // 处理401错误，但不自动重定向
      if (response.status === 401) {
        console.error('认证失败，无法从心愿单移除');
        showToast('登录已过期，请重新登录后再试');
        return false;
      }

      // 尝试获取错误信息
      let errorMessage = '从心愿单移除失败';
      try {
        const errorText = await response.text();
        console.error('从心愿单移除失败，服务器响应:', errorText);
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (e) {
        console.error('无法解析错误响应:', e);
      }

      showToast(errorMessage);
      return false;
    }

    showToast('已从心愿单移除');
    return true;
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    showToast('从心愿单移除失败，请稍后再试');
    return false;
  }
}

// 获取礼物详情
async function getGiftDetails(giftId) {
  try {
    console.log('获取礼物详情，ID:', giftId);

    if (!giftId || isNaN(giftId)) {
      console.error('无效的礼物ID:', giftId);
      throw new Error('无效的礼物ID');
    }

    // 首先尝试从页面上获取礼物详情
    const giftCard = document.querySelector(`.gift-card[data-id="${giftId}"]`);
    if (giftCard) {
      console.log('从页面元素获取礼物详情');
      const name = giftCard.querySelector('.gift-name')?.textContent || '未知礼物';
      const priceText = giftCard.querySelector('.gift-price')?.textContent || '¥0';
      const price = parseFloat(priceText.replace('¥', '')) || 0;
      const description = giftCard.querySelector('.gift-description')?.textContent || '';
      const imageUrl = giftCard.querySelector('.gift-image')?.src || '';

      const giftDetails = {
        id: giftId,
        name,
        price,
        description,
        imageUrl
      };

      console.log('获取到的礼物详情:', giftDetails);
      return giftDetails;
    }

    // 如果无法从页面获取，则尝试从默认礼物数据获取
    console.log('尝试从默认礼物数据获取');
    const defaultGifts = [
      {
        id: 1,
        name: '定制情侣项链',
        price: 299,
        description: '这款定制项链，将你们的名字刻在一起，让爱永恒闪耀',
        imageUrl: 'images/gifts/gift1.webp',
        purchaseUrl: 'https://example.com/necklace'
      },
      {
        id: 2,
        name: '永生玫瑰礼盒',
        price: 399,
        description: '精选永生玫瑰，象征永不凋零的爱情，浪漫与美丽常伴',
        imageUrl: 'images/gifts/gift2.jpg',
        purchaseUrl: 'https://example.com/roses'
      },
      {
        id: 3,
        name: '定制爱情相册',
        price: 199,
        description: '记录你们的美好瞬间，每一页都承载着甜蜜回忆',
        imageUrl: 'images/gifts/gift3.jpg',
        purchaseUrl: 'https://example.com/album'
      }
    ];

    const gift = defaultGifts.find(g => g.id == giftId);
    if (gift) {
      console.log('从默认数据获取到礼物:', gift);
      return gift;
    }

    // 最后尝试从API获取
    console.log('尝试从API获取礼物详情');
    const response = await fetch(`${API_BASE_URL}/gifts/${giftId}`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      throw new Error('获取礼物详情失败');
    }

    const apiGift = await response.json();
    console.log('从API获取到礼物:', apiGift);
    return apiGift;
  } catch (error) {
    console.error('获取礼物详情失败:', error);

    // 如果所有方法都失败，返回一个默认的礼物对象
    const defaultGift = {
      id: giftId,
      name: '礼物' + giftId,
      price: 100,
      description: '这是一个默认的礼物描述。',
      imageUrl: 'images/gifts/default.jpg'
    };

    console.log('使用默认礼物对象:', defaultGift);
    return defaultGift;
  }
}

// 标记已添加到心愿单的礼物
async function markWishlistedItems() {
  try {
    console.log('开始标记已添加到心愿单的礼物');

    // 检查是否已登录
    if (!localStorage.getItem('authToken')) {
      console.log('用户未登录，跳过标记心愿单');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/wishlist`, {
      method: 'GET',
      headers: getAuthHeader()
    });

    if (!response.ok) {
      console.error('获取心愿单失败:', response.status);
      // 不使用handleApiError，避免自动重定向
      if (response.status === 401) {
        console.warn('认证已过期，无法获取心愿单');
        showToast('登录已过期，无法获取心愿单信息');
        return;
      }
      throw new Error('Failed to fetch wishlist');
    }

    const wishlist = await response.json();
    console.log('获取到的心愿单数据:', wishlist);

    // 标记已添加的礼物
    document.querySelectorAll('.gift-card').forEach(card => {
      const btn = card.querySelector('.wishlist-btn');
      if (!btn) return;

      const cardName = card.querySelector('.gift-name')?.textContent ||
        card.querySelector('h3')?.textContent;
      if (!cardName) return;

      console.log(`检查礼物 "${cardName}" 是否在心愿单中`);

      // 查找对应的心愿单项目 - 使用更灵活的匹配方式
      const wishlistItem = wishlist.find(item => {
        // 精确匹配
        if (item.name === cardName) return true;

        // 部分匹配 - 检查礼物名称是否包含在心愿单项目名称中，或者反之
        if (item.name && cardName &&
          (item.name.includes(cardName) || cardName.includes(item.name))) {
          return true;
        }

        return false;
      });

      if (wishlistItem) {
        console.log(`礼物 "${cardName}" 在心愿单中，ID: ${wishlistItem.id}`);
        btn.innerHTML = '<i class="fa fa-check"></i> 已加入心愿单';
        btn.classList.add('added');
        btn.setAttribute('data-wishlist-id', wishlistItem.id);
      } else {
        console.log(`礼物 "${cardName}" 不在心愿单中`);
      }
    });

    console.log('心愿单标记完成');
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    // 出错时不重定向，只显示错误
    showToast('获取心愿单数据失败');
  }
} 
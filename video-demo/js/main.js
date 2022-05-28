/*
 * @Author: scarecrow scarecrow.wilderness@gmail.com
 * @Date: 2022-05-18 21:56:02
 * @LastEditors: scarecrow scarecrow.wilderness@gmail.com
 * @LastEditTime: 2022-05-28 21:14:01
 * @FilePath: /demo/video-demo/js/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
if (Hls.isSupported()) {
  let video = document.getElementById('video');
  let hls = new Hls();
  hls.attachMedia(video);
  /** 是否就绪 */
  hls.on(Hls.Events.MEDIA_ATTACHED, function () {
    hls.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
  });

}



const myVideo = document.getElementById('video');
const myProgress = document.getElementById('seek');
const fic = new FicList(50)


/**
 * @description: video 开始播放暂停
 * @param flag: true 播放，false 暂停
 */
function videoPlay(flag) {
  flag ? myVideo.play() : myVideo.pause();
}

/**
 * @description: 从指定时间开始播放
 */
function videoTimePlay() {
  const stratInput = document.getElementById("stratInput");
  if (!stratInput.value) {
    alert("请输入播放开始时间");
    return;
  }
  myVideo.currentTime = stratInput.value;
  videoPlay(true);
}




/** 弹幕数据 */
let bulletChatArr = []; // 弹幕源数据
let bulletChatArrCopy = []; // copy弹幕数据，用于展示列表
/** 视频总时长 */
let videoDuration = 0
/** 分段长度 单位秒（s） */
let subLength = 90
/** 分段记录，记录每个分段 的请求详情 */
let subList=[]
/** 后端返回弹幕时间  必须在这个时间范围内返回*/
let responseTime = 20
/** 记录上次播放时间 用于判断前进后退 */
let videoCurrentTime = 0;
/** 用于渲染弹幕 */
let renderList = [];
/** 是否不能渲染弹幕   当拖拽进度条时为true，此时不能渲染弹幕  */
let chatFlag = false




/**
 * @description: 视频分段，视频可播放后获取长度，对视频进行分段处理，记录每段的范围，以及数据是否已经请求回来，分段后首先加载第一段弹幕
 */
function subsection() {
  videoDuration = this.duration
  const length = this.duration % subLength==0?(this.duration/subLength):(Math.floor(this.duration/subLength)+1)
  subList = new Array(length).fill(1).map((el,index)=>({
    /** 请求状态
       * notStarted:未开始
       * pending : 正在请求
       * fulfilled：已结束
       */
     status:'notStarted',
     /** 开始时间 */
     timeRange : calculTime(index,index === length-1)
  }))
  /** 分段完成 立刻请求第一阶段弹幕 */
  loadingChange(true)
  getBulletChat(0).then(()=>{
    loadingChange(false)
  }).catch(()=>{
    loadingChange(false)
  })
}

/**
 * @description: 计算分段时间范围
 * @param len : 当前处于第几段
 * @param isEnd : 是否结束
 * @return {*} : 时间范围
 */
function calculTime(len,isEnd) {
  return [
    len * subLength,
    isEnd ? videoDuration : ((len+1) * subLength)-1
  ]
}



/**
 * @description: 请求弹幕数据，请求完成将数据拼接到数据桶中，更改分段记录中的请求状态
 * @param curLen:
 */
async function getBulletChat(curLen) {
  if (!subList[curLen] || subList[curLen].status !== 'notStarted') return
  const params =  subList[curLen].timeRange
  subList[curLen].status = 'pending'
  try {
    const { data } = await ajaxPost("http://122.51.157.252:3000/mock/132/bulletChat",{time:params});
    bulletChatArr = _.sortBy(bulletChatArr.concat(data), function (o) {return o.time;});
    bulletChatArrCopy = _.cloneDeep(bulletChatArr);
    /** 因为请求数据，会重置 数据桶 ，所以将已渲染的弹幕集合清空，重新进行弹幕渲染 */
    renderList = []
    subList[curLen].status = 'fulfilled'
  } catch (error) {
    subList[curLen].status = 'fulfilled'
  }
}

/**
 * @description: 判读当前所处时间段
 * @param currentTime:video 播放的当前时间
 * @return {*}:当前处于哪一阶段
 */
function getCurSubLen(currentTime) {
  const num = parseFloat(new Big(currentTime).plus(1).div(subLength))
  const currentSub = (currentTime-1) % subLength === 0 ? num : Math.floor(num)+1
  return currentSub
}
/**
 * @description: 判断当前时间节点，是否处于 预加载下一阶段弹幕的时间范围，预加载下一阶段弹幕的时间范围为 阶段结束时间-responseTime
 * @param currentTime:video 播放的当前时间
 * @return {*}:true 是 false 否
 */
function isResRange(currentTime) {
  const curlen = getCurSubLen(currentTime)-1
  const end = subList[curlen].timeRange[1]
  if (_.inRange(currentTime, end - responseTime, end+1)) {
    return true
  }else{
    return false
  }
}








/**
 * @description: 监听video播放时间改变触发
 */
function videoTimeChange() {

  if (chatFlag) return
  if (isResRange(this.currentTime)) getBulletChat(getCurSubLen(this.currentTime))
  /** 根据触发时长  过滤满足条件的弹幕 */
  filterList(this.currentTime,videoCurrentTime)
  videoCurrentTime = this.currentTime;
  fic.change(renderList)
}


/**
 * @description: 过滤满足 渲染条件的 弹幕
 * @param {*} timeDisplay:当前播放时长
 * @param {*} oldtimeDisplay:上一次播放时长
 * @return {*}
 */
function filterList(timeDisplay,oldtimeDisplay){

  if (timeDisplay < oldtimeDisplay) {
    renderList = []
    bulletChatArrCopy = _.cloneDeep(bulletChatArr);
  }
  const lastNeedIndex = _.findIndex(bulletChatArrCopy,(e) => e.time > timeDisplay);
  if (lastNeedIndex<=0) return
  const needRender = bulletChatArrCopy.splice(0, lastNeedIndex);
  renderList.push(...needRender);
}



function progressMousedown() {
  chatFlag = true
}
function progressChange(){
  renderList = []
}

async function progressMouseup(){
  const curLen =  getCurSubLen(myVideo.currentTime)-1
  /** 如果当前时间断数据未请求 */
  if (subList[curLen].status === 'notStarted') {
    videoPlay(false) // 暂停播放
    loadingChange(true)
    try {
      await getBulletChat(curLen)
      if (isResRange(myVideo.currentTime)) await getBulletChat(curLen+1)
      loadingChange(false)
      chatFlag = false
    } catch (error) {
      loadingChange(false)
      chatFlag = false
    }
  }else{
    chatFlag = false
  }
}


/** 获取资源长度 */
myVideo.addEventListener("loadedmetadata",subsection)
myVideo.addEventListener("timeupdate",videoTimeChange)
myProgress.addEventListener('mousedown',progressMousedown)
myProgress.addEventListener('mouseup',progressMouseup)
myProgress.addEventListener('change',progressChange)
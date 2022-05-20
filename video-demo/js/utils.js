/*
 * @Author: scarecrow scarecrow.wilderness@gmail.com
 * @Date: 2022-05-18 21:56:31
 * @LastEditors: scarecrow scarecrow.wilderness@gmail.com
 * @LastEditTime: 2022-05-19 14:05:26
 * @FilePath: /demo/video-demo/js/utils.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/** ajax 请求 */
function ajaxPost(url, data) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    xhr.send(JSON.stringify(data));
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          let resData;
          try {
            resData = JSON.parse(xhr.responseText);
          } catch (error) {
            resData = xhr.responseText;
          }
          resolve(resData);
        } else {
          reject(xhr.status);
        }
      }
    };
  });
}


/** 虚拟列表处理 */
class FicList {
  constructor(itemHeight) {
    this.itemHeight = itemHeight;
    this.count = Math.ceil(document.getElementById("ficListBox").clientHeight / itemHeight);
    document.getElementById("listView").addEventListener("scroll", this.scrollFunction.bind(this))
  }

  change(renderList){
    this.renderList = renderList
    /** 计算滚动条高度 */
    this.scrollHeightChange()
    document.getElementById("listView").scrollTo(0,this.itemHeight * (this.renderList.length-this.count))
  }

  /** 滚动条 高度变化 */
  scrollHeightChange() {
    document.getElementById("scrollBox").style.height = `${
      this.itemHeight * this.renderList.length
    }px`;
  }

  /** 滚动时处理数据 */
  scrollFunction() {
    // 获取滚动条距离可视区顶部的距离
    let {scrollTop,scrollHeight } = document.getElementById("listView");

    if (scrollTop >= scrollHeight) {
      scrollTop = scrollHeight - (this.itemHeight * this.count)
    }
    let startIndex = Math.floor(scrollTop / this.itemHeight);
    let endIndex = startIndex + this.count;
    this.loadData(startIndex, endIndex);
    document.getElementById("listContent").style.transform = `translate3d(0, ${startIndex * this.itemHeight}px, 0)`;
  }

  loadData(start, end) {
    // 截取数据
    let sliceData = this.renderList.slice(start, end);
    // 创建虚拟DOM
    let F = document.createDocumentFragment();
    for (let i = 0; i < sliceData.length; i++) {
      let li = document.createElement("li");
      li.innerHTML = `
    <div class="info">
      <span class="chat-name">${sliceData[i].userName}:</span>
      <span class="chat-text">${sliceData[i].text}</span>
    </div>
    <div class="chat-time">
      发送时间:
      <span class="chat-time">${sliceData[i].time}</span>
    </div>
    `;
      li.id = sliceData[i].id;
      li.className = "list-item";
      F.appendChild(li);
    }
    document.querySelector(".list-content").innerHTML = "";
    document.querySelector(".list-content").appendChild(F);
  }
}


function loadingChange(flag) {
  const load = document.getElementById('loadingBox')
  flag ? load.style.display='flex':load.style.display='none'
}
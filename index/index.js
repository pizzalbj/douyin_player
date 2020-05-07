
var respository = require("../repository")

/**
 * 页面的视频列表，最多 pageSize 个
 * 不通过setData videoList 的个数来动态更新视频，因为切换的时候动画会卡顿一下
 * 所以这里采取：固定videoList的个数（pageSize），通过<swiper circular="{{true}}">和更改前后视频的url来更新
 */
Page({
  data: {
    systemInfo: null,
    page: 1, // page。1用于加载视频、2用于切换不同页的视频
    pageSize: 5, // 最好大于等于5，不能小于4
    totalPage: 4, // 总页数
    lenOfLastPage: Number,  // 最后一页的个数
    videoListAll: [], // 所有的视频列表 [[{},{}..], [{},{}..]]。单页：this.data.videoListAll[page - 1]
    videoList: [], // 页面的视频列表[{},{},{}..]
    videoListContext: [], // 所有的视频列表对应的context对象，控制暂停|播放
    current: 0, // 记录上一个current
    circular: true,  // 循环播放
    isPlaying: true, // 暂停|播放
    isLike: false, // 点赞
  },

  onLoad: function () {
    this.getSystemInfo()
    this.getVideoList(1)
  },

  getSystemInfo: function () {
    let that = this
    wx.getSystemInfo({
      complete: (res) => {
        that.setData({
          systemInfo: res
        })
      },
    })
  },

  /**
   * 加载视频列表
   * 初始化后，只在next()调用
   * @param {*} page 
   */
  getVideoList: function (page) {
    let that = this
    let data = this.data
    if(page > data.totalPage) return
    respository.getMediaList(page, data.pageSize, (res) => {
      if (true) { // 如果请求成功 and len > 0
        let videoListAllTemp = data.videoListAll
        videoListAllTemp.push(res)
        that.setData({
          page: page, // update page
          totalPage: 4,
          videoListAll: videoListAllTemp // 追加 video 到所有的视频列表
        })
        that.concatVideoList(page)
      }
    })
  },

  /**
   * 切换视频，判断方向（上下）
   * @param {*} e 
   */
  changeSwiper: function (e) {
    if (e.detail.source == "touch") { // 手动
      let data = this.data
      let currentDetail = e.detail.current
      let currentData = data.current
      // console.log("currentDetail: " + currentDetail)
      if (currentDetail > currentData) {
        if (currentDetail - currentData == 1) { // 正常切换下一个
          this.next(currentDetail, currentData)
        } else { // 特殊情况：第二页的第一个切换到第一页的最后一个，则 currentDetail: this.data.videoList.length - 1、currentData: 0
          this.pre(currentDetail)
        }
      } else if (currentDetail < currentData) {
        if (currentData - currentDetail == 1) { // 正常切换到上一个
          this.pre(currentDetail, currentData)
        } else { // 特殊情况：第一页的最后一个切换到第二页的第一个，则 currentDetail: 0、currentData: this.data.videoList.length - 1
          this.next(currentDetail)
        }
      }
      // 播放视频
      this.playVideo(currentDetail)
      // update current and isPlaying
      this.setData({
        current: currentDetail,
        isPlaying: true
      })
    }
  },

  /**
   * 切换到下一个视频
   * @param {*} currentDetail 
   * @param {*} currentData 
   */
  next: function (currentDetail, currentData) {
    let data = this.data
    let pageSize = data.pageSize
    let page = data.page
    // 第一页前几个
    if (page == 1 && currentDetail <= pageSize - 1 - 2) return
    if (currentDetail == pageSize - 2) { // 当前页面倒数第二个，加载下一页的视频列表，并更新倒数第四个和以前的视频列表
      this.getVideoList(page + 1)
    } else if (currentDetail == pageSize - 1) { // 当前页面最后一个，更新倒数第三个的视频
      this.updateVideoList("lastOne")
    } else if (currentDetail == 0 && currentData != 0) { // 下个页面第一个，更新上个页面倒数第二个的视频
      this.updateVideoList("toNextPage")
    } else if (currentDetail == 1 && currentData == 0 && page > 1) { // 下个页面第二个，更新上个页面倒数第一个的视频
      this.updateVideoList("toNextPageTwo")
    } else {
      console.log("下一个。maybe something wrong")
    }
  },

  /**
   * 切换到上一个视频
   * @param {*} currentDetail
   */
  pre: function (currentDetail, currentData) {
    let data = this.data
    let page = data.page
    let pageSize = data.pageSize
    let videoListTemp = data.videoList
    let videoPage = []
    // 第一页 前几个
    if (page == 1 && currentDetail <= pageSize - 1 - 2) return
    // 第一页 倒数第二个 -> 倒数第三个
    if (page >= 2 && currentDetail == pageSize - 1 - 2) {
      let pageTemp = page - 1
      videoPage = data.videoListAll[page - 1 - 1]
      for (let i = 0; i < pageSize - 1 - 2; i++) {
        videoListTemp[i] = videoPage[i]
      }
      this.setData({
        page: pageTemp, // updage page
        videoList: videoListTemp // 更新 倒数第三个之前的 
      })
      return 
    }
    if(page >= 2 && currentDetail == pageSize - 1 - 1) {
      // console.log("第一页 倒数第一个 -> 倒数第二个")
      // 更新 倒数第三个
      videoPage = data.videoListAll[page - 1 - 1]
      videoListTemp[pageSize - 1 - 2] = videoPage[pageSize - 1 - 2]
      this.setData({
        videoList: videoListTemp
      })
      return 
    }
    if(page >= 2 && currentDetail == pageSize - 1) {
      // console.log("第二页第一个 -> 第一页倒数第一个")
      // 更新 倒数第二个
      videoPage = data.videoListAll[page - 1 - 1]
      videoListTemp[pageSize - 1 - 1] = videoPage[pageSize - 1 - 1]
      this.setData({
        videoList: videoListTemp
      })
      return
    }
    if(page >= 2 && currentDetail == 0) {
      // console.log("第二页第二个 -> 第二页第一个")
      // 更新 倒数第一个
      videoPage = data.videoListAll[page - 1 - 1]
      videoListTemp[pageSize - 1] = videoPage[pageSize - 1]
      this.setData({
        videoList: videoListTemp
      })
      return
    }
    if(page >= 2 && currentDetail < pageSize - 1 - 2) {
      // console.log("第二页 中间切换")
      videoPage = data.videoListAll[page - 1]
      videoListTemp[currentDetail - 1] = videoPage[currentDetail - 1]
      this.setData({
        videoList: videoListTemp
      })
      return
    }
  },

  /**
   * 服务器加载完视频列表后，更新 页面的视频列表
   * @param {*} page 
   */
  concatVideoList: function (page) {
    let data = this.data
    let videoPage = JSON.parse(JSON.stringify(data.videoListAll[page - 1]))
    if (page == 1) {
      // 初次获取，第一页，保存视频。默认第一页视频的个数 >= pageSize
      let videoListTemp = JSON.parse(JSON.stringify(this.data.videoListAll[0]))
      this.setData({
        videoList: videoListTemp
      })
      // 设置 videoListContext，控制暂停|播放
      let videoListTempTwo = JSON.parse(JSON.stringify(this.data.videoListAll[0]))
      let videoListContextTemp = data.videoListContext
      videoListTempTwo.forEach(function (v, i) {
        let videoContextTemp = wx.createVideoContext("myVideo_" + i)
        videoListContextTemp.push(videoContextTemp)
      })
      this.setData({
        videoListContext: videoListContextTemp
      })
      this.playVideo(0)
    } else { // 非第一页 追加数据处理
      // console.log("非第一页 追加视频")
      if (videoPage.length == 0) return;
      let videoListTemp = data.videoList
      let len = videoPage.length
      if (len < data.pageSize - 2) { // 视频个数不足pageSize个（最后一页），直接赋值就好
        for (let i = 0; i < videoPage.length; i++) {
          videoListTemp[i] = videoPage[i]
        }
        this.setData({
          lenOfLastPage: len
        })
      } else { // 视频个数==pageSize（非最后一页），更新倒数第三个和以前的视频列表
        for (let i = 0; i < data.pageSize - 3; i++) { // 3的由来：从倒数第二个开始加载，所以 -2，再 -1 是因为上一个视频的data我们不处理，因为会切换到上一个视
          videoListTemp[i] = videoPage[i]
        }
      }
      this.setData({
        videoList: videoListTemp
      })
    }
  },

  /**
   * 向下切换视频后，更新其他部分视频url
   * @param {*} type 
   */
  updateVideoList: function (type) {
    let data = this.data
    let page = data.page
    let pageSize = data.pageSize
    let videoPage = JSON.parse(JSON.stringify(data.videoListAll[page - 1]))
    let videoListTemp = data.videoList
    if (type == "lastOne") {
      // 更新 倒数第三个的视频
      videoListTemp[pageSize - 1 - 2] = videoPage[pageSize - 1 - 2]
    } else if (type == "toNextPage") {
      // 更新 倒数第二个的视频
      videoListTemp[pageSize - 1 - 1] = videoPage[pageSize - 1 - 1]
    } else if (type == "toNextPageTwo") {
      // 更新 倒数第一个的视频
      videoListTemp[pageSize - 1] = videoPage[pageSize - 1]
    }
    this.setData({
      videoList: videoListTemp
    })
  },

  /**
   * 切换视频后 播放视频
   * @param {*} current 
   */
  playVideo: function (current) {
    let data = this.data
    let videoListContext = data.videoListContext
    // 全部暂停
    videoListContext.forEach(function (v, i) {
      if (i != current) {
        v.pause()
        v.seek(0)
      }
    })
    // 开始播放
    setTimeout(function () {
      videoListContext[current].play()
    }, 150)
  },

  /**
   * 手动 暂停|播放
   * @param {*} e 
   */
  playOrPause: function (e) {
    let index = e.currentTarget.dataset.index
    let data = this.data
    if (data.isPlaying) {
      data.videoListContext[index].pause()
    } else {
      data.videoListContext[index].play()
    }
    let isPlayingTemp = !data.isPlaying
    this.setData({
      isPlaying: isPlayingTemp
    })
  },

  /**
   * 右上角点赞
   */
  switchIsLike: function () {
    let isLikeTemp = !this.data.isLike
    this.setData({
      isLike: isLikeTemp
    })
  }
})

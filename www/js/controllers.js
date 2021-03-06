angular.module('kidney.controllers', ['ionic', 'kidney.services', 'ngResource', 'ionic-datepicker', 'kidney.directives'])//, 'ngRoute'

.controller('SignInCtrl', ['$ionicLoading', '$scope', '$timeout', '$state', 'Storage', '$ionicHistory', 'Data', 'User', '$sce', 'Mywechat', 'Patient', 'mySocket', function ($ionicLoading, $scope, $timeout, $state, Storage, $ionicHistory, Data, User, $sce, Mywechat, Patient, mySocket) {
  $scope.navigation_login = $sce.trustAsResourceUrl('http://patientdiscuss.haihonghospitalmanagement.com/member.php?mod=logging&action=logout&formhash=xxxxxx')
  $scope.autologflag = 0

  /**
   * [从本地存储中取手机号码USERNAME,如果有则显示在登录页面，无则显示空]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  if (Storage.get('USERNAME') != null && Storage.get('USERNAME') != undefined) {
    $scope.logOn = {username: Storage.get('USERNAME'), password: ''}
  } else {
        // alert('USERNAME null')
    $scope.logOn = {username: '', password: ''}
  }
  /**
   * [判断能否直接登录（先判断微信是否能直接登录；再判断手机号码密码是否能直接登录;能直接登录就登录然后跳转到主页（任务））注：登录过的手机号码或者微信会记录在本地]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  if (Storage.get('patientunionid') != undefined && Storage.get('bindingsucc') == 'yes') {
    User.logIn({username: Storage.get('patientunionid'), password: '112233', role: 'patient'}).then(function (data) {
      if (data.results.mesg == 'login success!') {
        Storage.set('isSignIN', 'Yes')
        Storage.set('UID', data.results.userId)// 后续页面必要uid

        Storage.set('bindingsucc', 'yes')
        var name = data.results.userName ? data.results.userName : data.results.userId
        mySocket.newUser(data.results.userId, name)
        $timeout(function () { $state.go('tab.tasklist') }, 500)
            // $state.go('tab.tasklist')
      }
    })
  } else if (Storage.get('isSignIN') == 'Yes') {
    if (Storage.get('USERNAME') != null && Storage.get('USERNAME') != undefined && Storage.get('PASSWORD') != null && Storage.get('PASSWORD') != undefined) {
      User.logIn({username: Storage.get('USERNAME'), password: Storage.get('PASSWORD'), role: 'patient'}).then(function (data) {
        if (data.results.mesg == 'login success!') {
          Storage.set('isSignIN', 'Yes')
          Storage.set('UID', data.results.userId)// 后续页面必要uid
                    // Storage.set('bindingsucc','yes')
          var name = data.results.userName ? data.results.userName : data.results.userId
          mySocket.newUser(data.results.userId, name)
          $timeout(function () { $state.go('tab.tasklist') }, 500)

                    // $state.go('tab.tasklist')
        }
      })
    }
  }
  /**
   * [手机号码和密码输入后点击登录:1、登录失败（账号密码不对，网络问题）；2、登录成功:2.1签过协议则跳转主页，2.2没签过则跳转协议页面]
   * @Author   PXY
   * @DateTime 2017-07-04
   * @param    logOn:{username:String, password:String}  注：username手机号码
   */
  $scope.signIn = function (logOn) {
    $scope.logStatus = ''
    if ((logOn.username != '') && (logOn.password != '')) {
      var phoneReg = /^(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/
            // 手机正则表达式验证
      if (!phoneReg.test(logOn.username)) {
        $scope.logStatus = '手机号验证失败！'
      } else {
        Storage.set('USERNAME', logOn.username)
        /**
         * [登录]
         * @Author   PXY
         * @DateTime 2017-07-04
         * @param    {username（手机号）:String, password:String,role:String} 注：患者登录role写死 'patient'
         * @return  data:（1、成功登录）{results: {status:Number,userId:String,userName:String,lastlogin:Date,mesg:String,token:String,refreshToken:String}}
         *               （2、账号密码错误）{results:Number,mesg:String}
         *          err
         */
        User.logIn({username: logOn.username, password: logOn.password, role: 'patient'}).then(function (data) {
          if (data.results == 1) {
            $scope.logStatus = '账号密码错误！'
          } else if (data.results.mesg == 'login success!') {
            $scope.logStatus = '登录成功！'
            $ionicHistory.clearCache()
            $ionicHistory.clearHistory()
            Storage.set('PASSWORD', logOn.password)
            Storage.set('TOKEN', data.results.token)// token作用目前还不明确
            Storage.set('isSignIN', 'Yes')
            Storage.set('UID', data.results.userId)
                        // Storage.set('UName',data.results.userName);
                        // 如果姓名不为空就发送姓名，否则直接发送id
            var name = data.results.userName ? data.results.userName : data.results.userId
            mySocket.newUser(data.results.userId, name)
            /**
             * [获取用户签署协议状态,agreement为0为签过协议，跳转主页；为1则没签过协议，跳转协议页面]
             * @Author   PXY
             * @DateTime 2017-07-04
             * @param    userId:String
             * @return   res:{result:{agreement: String}}
             *           err
             */
            User.getAgree({userId: data.results.userId}).then(function (res) {
              if (res.results.agreement == '0') {
                $timeout(function () { $state.go('tab.tasklist') }, 500)
              } else {
                $timeout(function () { $state.go('agreement', {last: 'signin'}) }, 500)
              }
            }, function (err) {
              $scope.logStatus = '网络错误！'
            })
          }
        }, function (err) {
          if (err.results == null && err.status == 0) {
            $scope.logStatus = '网络错误！'
            return
          }
          if (err.status == 404) {
            $scope.logStatus = '连接服务器失败！'
          }
        })
      }
    } else {
      $scope.logStatus = '请输入完整信息！'
    }
  }

  var ionicLoadingshow = function () {
    $ionicLoading.show({
      template: '登录中...'
    })
  }
  var ionicLoadinghide = function () {
    $ionicLoading.hide()
  }
  /**
   * [点击注册,跳转获取验证码页面，传递参数register表示注册流程]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  $scope.toRegister = function () {
    $state.go('phonevalid', {phonevalidType: 'register'})
  }
  /**
   * [点击重置密码,跳转获取验证码页面，传递参数reset表示重置密码流程]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  $scope.toReset = function () {
    $state.go('phonevalid', {phonevalidType: 'reset'})
  }
  /**
  * *[微信登录点击，获取用户unionid，以及个人基本信息]
  * @Author   ZXF
  * @DateTime 2017-07-05
  * @return   {[type]}
  */
  $scope.wxsignIn = function () {
      /**
       * *[微信js版sdk自带方法，微信登录，获取用户授权之后拿到用户的基本信息]
       * @Author   ZXF
       * @DateTime 2017-07-05
       * @param    {[type]}
       * @param    {[type]}
       * @return   code:string
       */
    var wxscope = 'snsapi_userinfo',
      wxstate = '_' + (+new Date())
    Wechat.auth(wxscope, wxstate, function (response) {
        // you may use response.code to get the access token.
        // alert(JSON.stringify(response));
        // alert(response.code);
        /**
         * *[根据unionid获取用户基本信息]
         * @Author   ZXF
         * @DateTime 2017-07-05
         * @param    {role: 'appPatient',code:string,state:?}
         * @param    {[type]}
         * @return   results:{headimgurl：微信头像路径，unionid：string，}
         */
      Mywechat.getUserInfo({role: 'appPatient', code: response.code, state: ''}).then(function (persondata) {
          // alert(JSON.stringify(persondata));
        Storage.set('wechatheadimgurl', persondata.results.headimgurl)

        $scope.unionid = persondata.results.unionid
          // alert($scope.unionid)
          // 判断这个unionid是否已经绑定用户了 有直接登录
          /**
           * *[根据unionid获取用户userid]
           * @Author   ZXF
           * @DateTime 2017-07-05
           * @param    {['username': unionid]}
           * @return   {results：[0:用户有与微信unionid绑定userid]，UserId：string，roles:['patient','doctor'...]用户所用的角色}
           */
        User.getUserID({'username': $scope.unionid}).then(function (ret) {
            // alert(JSON.stringify(ret))
            // 用户已经存在id 说明公众号注册过
            // 未测试
            /**
             * *[将用户的微信头像存在用户表中，如果用户没有头像存，有则不修改]
             * @Author   ZXF
             * @DateTime 2017-07-05
             * @param    {[patientId：string，wechatPhotoUrl：微信头像路径]}
             * @return   {[type]}
             */
          if (Storage.get('wechatheadimgurl') && ret.results === 0) {
                // alert("image"+ret.UserId+Storage.get('wechatheadimgurl'));
            Patient.replacePhoto({'patientId': ret.UserId, 'wechatPhotoUrl': Storage.get('wechatheadimgurl')}).then(function (data) {
                        // alert(JSON.stringify(data));
              Storage.rm('wechatheadimgurl')
            }, function (err) {
              console.log(err)
            }
                )
                // 已有头像，未更新;没有头像，已替换
          }

          if (ret.results == 0 && ret.roles.indexOf('patient') != -1) { // 直接登录
            ionicLoadingshow()
            /**
             * [用户的unionid登录，密码不能为空可以随意填写]
             * @Author   ZXF
             * @DateTime 2017-07-05
             * @param    logOn:{username:String, password:String，role：string}  注：username：unionid
             */
            User.logIn({username: $scope.unionid, password: '112233', role: 'patient'}).then(function (data) {
                // alert("sername:$scope.unionid,password:112"+JSON.stringify(data));
              if (data.results.mesg == 'login success!') {
                Storage.set('isSignIN', 'Yes')
                Storage.set('UID', ret.UserId)// 后续页面必要uid

                Storage.set('patientunionid', $scope.unionid)// 自动登录使用
                Storage.set('bindingsucc', 'yes')

                mySocket.newUser(ret.UserId)

                $timeout(function () {
                  ionicLoadinghide()
                  $state.go('tab.tasklist')
                }, 500)
                  // Patient.getPatientDetail({ userId: Storage.get('UID') }).then(function(data){
                  //   alert(JSON.stringify(data))
                  //   if(data.results){
                  //       $timeout(function(){
                  //           ionicLoadinghide();
                  //           $state.go('tab.tasklist');
                  //       },500);
                  //       mySocket.newUser(data.results.userId,data.results.name);
                  //   }else{
                  //       $timeout(function(){
                  //           ionicLoadinghide();
                  //           $state.go('tab.tasklist');
                  //       },500);
                  //       mySocket.newUser(data.results.userId,data.results.name);
                  //   }
                  // },function(e){
                  //   console.log(e)
                  //   // alert(JSON.stringify(e))
                  //   ionicLoadinghide();
                  // });
                  // $state.go('tab.tasklist')
              }
            }, function (er) {
                // alert(JSON.stringify(er))
              ionicLoadinghide()
            })
          } else {
                // alert('else');
            Storage.set('patientunionid', $scope.unionid)// 自动登录使用
            $state.go('phonevalid', {phonevalidType: 'wechatsignin'})
          }
        })
      }, function (err) {
          // alert(JSON.stringify(err));
      })
    }, function (reason) {
      $ionicLoading.show({
        template: reason,
        duration: 1000
      })
    })
  // }

    // }
  }
}])

.controller('AgreeCtrl', ['$stateParams', '$scope', '$timeout', '$state', 'Storage', '$ionicHistory', '$http', 'Data', 'User', '$ionicPopup', 'mySocket', function ($stateParams, $scope, $timeout, $state, Storage, $ionicHistory, $http, Data, User, $ionicPopup, mySocket) {
  /**
   * [点击同意协议，如果是登录补签协议则更新协议状态后跳转主页；如果是注册则更新协议状态后跳转设置密码]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  $scope.YesIdo = function () {
    if ($stateParams.last == 'signin') {
      /**
       * [更新协议状态]
       * @Author   PXY
       * @DateTime 2017-07-04
       * @param    {userId:String,agreement:String} 注：agreement写'0'表示签过协议
       * @return   data:{results:Object,msg:"success"}
       *           err
       */
      User.updateAgree({userId: Storage.get('UID'), agreement: '0'}).then(function (data) {
        if (data.results != null) {
          $timeout(function () { $state.go('tab.tasklist') }, 500)
        } else {
          console.log('用户不存在!')
        }
      }, function (err) {
        console.log(err)
      })
    } else if ($stateParams.last == 'register') {
      $timeout(function () { $state.go('setpassword', {phonevalidType: 'register'}) }, 500)
    } else if ($stateParams.last == 'patientofimport') {
          // 导入的用户
      User.updateAgree({userId: Storage.get('UID'), agreement: '0'}).then(function (response) {
        console.log(response)
      }, function (err) {
        console.log(err)
      })
          // 绑定
      User.setOpenId({phoneNo: Storage.get('USERNAME'), openId: Storage.get('patientunionid')}).then(function (response) {
        Storage.set('bindingsucc', 'yes')
        console.log(response)
      })
      $ionicPopup.show({
        title: '微信账号绑定手机账号成功，您的初始密码是123456，您以后也可以用手机号码登录！',
        buttons: [
          {
            text: '確定',
            type: 'button-positive',
            onTap: function (e) {
              $state.go('tab.tasklist')
            }
          }
        ]
      })
    } else {
      $timeout(function () { $state.go('setpassword', {phonevalidType: 'wechatsignin'}) }, 500)
    }
  }
}])

// 手机号码验证--PXY
.controller('phonevalidCtrl', ['$scope', '$state', '$interval', '$stateParams', 'Storage', 'User', '$timeout', function ($scope, $state, $interval, $stateParams, Storage, User, $timeout) {
  // Storage.set("personalinfobackstate","register")

  $scope.Verify = {Phone: '', Code: ''}
  $scope.veritext = '获取验证码'
  $scope.isable = false
  /**
   * [disable获取验证码按钮1分钟，并改变获取验证码按钮显示的文字]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  var unablebutton = function () {
     // 验证码BUTTON效果
    $scope.isable = true
    $scope.veritext = '60S再次发送'
    var time = 59
    var timer
    timer = $interval(function () {
      if (time == 0) {
        $interval.cancel(timer)
        timer = undefined
        $scope.veritext = '获取验证码'
        $scope.isable = false
      } else {
        $scope.veritext = time + 'S再次发送'
        time--
      }
    }, 1000)
  }
  /**
   * [发送验证码]
   * @Author   PXY
   * @DateTime 2017-07-04
   * @param    phone:String
   */
  var sendSMS = function (phone) {
    /**
     * [发送验证码,disable按钮一分钟，并根据服务器返回提示用户]
     * @Author   PXY
     * @DateTime 2017-07-04
     * @param    {mobile:String,smsType:Number}  注：写死 1
     * @return   data:{results:Number,mesg:String} 注：results为0为成功发送
     *           err
     */
    User.sendSMS({mobile: phone, smsType: 1}).then(function (data) {
      unablebutton()
      if (data.mesg.substr(0, 8) == '您的邀请码已发送') {
        $scope.logStatus = '您的验证码已发送，重新获取请稍后'
      } else if (data.results == 1) {
        $scope.logStatus = '验证码发送失败！'
      } else {
        $scope.logStatus = '验证码发送成功！'
      }
    }, function (err) {
      if (err.results == null && err.status == 0) {
        $scope.logStatus = '连接超时!'
        return
      }
      $scope.logStatus = '验证码发送失败！'
    })
  }

    // console.log($stateParams.phonevalidType);

  $scope.patientofimport = 0
  /**
   * [点击获取验证码，如果为注册，注册过的用户不能获取验证码；如果为重置密码，没注册过的用户不能获取验证码]
   * @Author   PXY
   * @DateTime 2017-07-04
   * @param    Verify:{Phone:String,Code:String} 注：Code没用到
   */
  $scope.getcode = function (Verify) {
    $scope.logStatus = ''

    if (Verify.Phone == '') {
      $scope.logStatus = '手机号码不能为空！'
      return
    }
    var phoneReg = /^(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/
        // 手机正则表达式验证
    if (!phoneReg.test(Verify.Phone)) {
      $scope.logStatus = '手机号验证失败！'
      return
    }

    // 如果为注册，注册过的用户不能获取验证码；
    if ($stateParams.phonevalidType == 'register') {
      /**
       * [根据手机号码获取userId]
       * @Author   PXY
       * @DateTime 2017-07-04
       * @param    {username:String}
       * @return   data:{results:Number，roles:Array} 注：1为未注册；0为已注册
       */
      User.getUserID({username: Verify.Phone}).then(function (data) {
        if (data.results == 0) {
          $scope.logStatus = '该手机号码已经注册！'
        } else if (data.results == 1) {
          sendSMS(Verify.Phone)
        }
      }, function () {
        $scope.logStatus = '连接超时！'
      })
    }
    // 如果为重置密码，没注册过的用户不能获取验证码
    else if ($stateParams.phonevalidType == 'reset') {
      User.getUserID({username: Verify.Phone}).then(function (data) {
        if (data.results == 1) {
          $scope.logStatus = '该账户不存在！'
        } else if (data.results == 0) {
          sendSMS(Verify.Phone)
        }
      }, function () {
        $scope.logStatus = '连接超时！'
      })
    } else if ($stateParams.phonevalidType == 'wechatsignin') {
      User.getUserID({username: Verify.Phone}).then(function (data) {
        if (data.results == 0 && data.roles.indexOf('patient') != -1) { // 导入的用户
          $scope.patientofimport = 1
          Storage.set('UID', data.UserId)
        }
        sendSMS(Verify.Phone)
      }, function () {
        $scope.logStatus = '连接超时！'
      })
    }
  }

  /**
   * [点击验证手机号，验证通过后如果是注册流程则跳转协议页面，如果是重置密码则跳转设置密码页面]
   * @Author   PXY
   * @DateTime 2017-07-04
   * @param    {[type]}
   * @return   {[type]}
   */
  $scope.gotoReset = function (Verify) {
    $scope.logStatus = ''
    if (Verify.Phone != '' && Verify.Code != '') {
        // 结果分为三种：(手机号验证失败)1验证成功；2验证码错误；3连接超时，验证失败
      var phoneReg = /^(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/
            // 手机正则表达式验证
      if (phoneReg.test(Verify.Phone)) {
        // 测试用
        // if(Verify.Code==5566){
        //     $scope.logStatus = "验证成功";
        //     Storage.set('USERNAME',Verify.Phone);
        //     if($stateParams.phonevalidType == 'register'){
        //         $timeout(function(){$state.go('agreement',{last:'register'});},500);
        //     }else{
        //        $timeout(function(){$state.go('setpassword',{phonevalidType:$stateParams.phonevalidType});},500);
        //     }

        // }else{$scope.logStatus = "验证码错误";}
        /**
         * [验证手机号码]
         * @Author   PXY
         * @DateTime 2017-07-04
         * @param    {mobile:String,smsType:Number,smsCode:String} 注：smsType写死1
         * @return   data:{results:Number,mesg:String}  注：results为0代表验证成功
         *           err
         */
        User.verifySMS({mobile: Verify.Phone, smsType: 1, smsCode: Verify.Code}).then(function (data) {
          if (data.results == 0) {
            $scope.logStatus = '验证成功'
            Storage.set('USERNAME', Verify.Phone)
            if ($stateParams.phonevalidType == 'register') {
              $timeout(function () { $state.go('agreement', {last: 'register'}) }, 500)
            } else if ($stateParams.phonevalidType == 'wechatsignin' && $scope.patientofimport) { // 微信登录 同时该患者是导入的病人即有uid
              $timeout(function () { $state.go('agreement', {last: 'patientofimport'}) }, 500)
            } else if ($stateParams.phonevalidType == 'wechatsignin') {
              $timeout(function () { $state.go('agreement', {last: 'wechatsignin'}) }, 500)
            } else {
              $timeout(function () { $state.go('setpassword', {phonevalidType: $stateParams.phonevalidType}) }, 500)
            }
          } else {
            $scope.logStatus = data.mesg
          }
        }, function () {
          $scope.logStatus = '连接超时！'
        })
      } else { $scope.logStatus = '手机号验证失败！' }
    } else { $scope.logStatus = '请输入完整信息！' }
  }
}])

// 设置密码  --PXY
.controller('setPasswordCtrl', ['$ionicLoading', '$http', '$scope', '$state', '$rootScope', '$timeout', 'Storage', '$stateParams', 'User', 'Patient', function ($ionicLoading, $http, $scope, $state, $rootScope, $timeout, Storage, $stateParams, User, Patient) {
  /**
   * [点击返回，返回到登录页面]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  $scope.BackMain = function () {
    $state.go('signin')
  }
  var setPassState = $stateParams.phonevalidType
  /**
   * [根据$stateParams.phonevalidType判断是重置密码还是注册流程，改变页面显示]
   * @Author   PXY
   * @DateTime 2017-07-04
   */
  if (setPassState == 'reset') {
    $scope.headerText = '重置密码'
    $scope.buttonText = '确认修改'
  } else {
    $scope.headerText = '设置密码'
    $scope.buttonText = '下一步'
  }
  $scope.setPassword = {newPass: '', confirm: ''}

  /**
   * [设置密码或重置密码，密码一致后如果是重置密码流程，则修改密码；如果是注册流程则注册、更新协议状态、注册论坛，最后跳转登录页面（微信则跳转到主页）]
   * @Author   PXY
   * @DateTime 2017-07-04
   * @param    setPassword:{newPass:String,confirm:String}
   */
  $scope.resetPassword = function (setPassword) {
    $scope.logStatus = ''
    if ((setPassword.newPass != '') && (setPassword.confirm != '')) {
      if (setPassword.newPass == setPassword.confirm) {
        // var phone = $stateParams.phoneNumber;
        // console.log(phone);
        if (setPassword.newPass.length < 6) {  /// ^(\d+\w+[*/+]*){6,12}$/   1.输入的密码必须有数字和字母同时组成，可含特殊字符，6-12位；
          $scope.logStatus = '密码太短了！'
        } else {
          // 如果是注册
          if (setPassState == 'register' || setPassState == 'wechatsignin') {
                      // 结果分为连接超时或者注册成功
            $rootScope.password = setPassword.newPass
            Storage.set('PASSWORD', setPassword.newPass)
            /**
             * [注册]
             * @Author   PXY
             * @DateTime 2017-07-04
             * @param    {phoneNo:String,password:String,role:String} 注：写死role: 'patient'
             * @return   data:{results:Number,userNo:String,...} 注：results为0为注册成功,userNo为userId
             */
            User.register({phoneNo: Storage.get('USERNAME'), password: setPassword.newPass, role: 'patient'}).then(function (data) {
              if (data.results == 0) {
                              // alert(JSON.stringify(data))
                var patientId = data.userNo
                Storage.set('UID', patientId)

                if (setPassState == 'wechatsignin') {
                  User.setOpenId({phoneNo: Storage.get('USERNAME'), openId: Storage.get('patientunionid')}).then(function (response) {
                    Storage.set('bindingsucc', 'yes')
                    console.log(response)
                  })
                }
                if (Storage.get('wechatheadimgurl')) {
                  /**
                   * [用微信头像替换个人头像（如果个人头像之前没有上传）]
                   * @Author   PXY
                   * @DateTime 2017-07-05
                   * @param    {patientId:String,wechatPhotoUrl:String}
                   * @return   data:Object
                   *           err
                   */
                  Patient.replacePhoto({patientId: patientId, wechatPhotoUrl: Storage.get('wechatheadimgurl')}).then(function (data) {
                    Storage.rm('wechatheadimgurl')
                  }
                                    )
                }
                // 注册论坛
                // 发送http请求，请求的地址是从论坛中抽出来的api
                // 参数：username->用户名->病人端用的是病人UID
                //     password->密码->密码和用户名一样
                //     password2->密码的确认->同上
                //     email->这里随便取得，邮箱的域名不一定有效
                //     regsubmit、formhash两个参数就这样填就行，forhash参数已经在论坛的代码中被注释掉了，随便填什么都行，它的作用是防止恶意注册
                $http({
                  method: 'POST',
                  url: 'http://patientdiscuss.haihonghospitalmanagement.com/member.php?mod=register&mobile=2&handlekey=registerform&inajax=1',
                  params: {
                    'regsubmit': 'yes',
                    'formhash': '',
                    'username': patientId,
                    'password': patientId,
                    'password2': patientId,
                    'email': patientId + '@bme319.com'
                  },  // pass in data as strings
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/xml, text/xml, */*'
                  }  // set the headers so angular passing info as form data (not request payload)
                }).success(function (data) {
                                    // console.log(data);
                                    // $state.go('tab.tasklist');
                })
                /**
                 * [更新协议状态，在注册流程中，虽然之前同意协议但是必须注册后用户才存在，因此在注册后更新协议状态]
                 * @Author   PXY
                 * @DateTime 2017-07-04
                 * @param    {userId:String,agreement:String} 注：agreement写死‘0’
                 * @return   data:Object
                 *           err
                 */
                User.updateAgree({userId: patientId, agreement: '0'}).then(function (data) {
                  if (data.results != null) {
                    if (setPassState == 'wechatsignin') {
                      $scope.logStatus = '注册结束后你也可以用手机号和密码登录！'
                    } else {
                      $scope.logStatus = '恭喜您注册成功！'
                    }
                    $timeout(function () { $state.go('signin') }, 1000)
                  }
                }, function (err) {
                  $ionicLoading.show({
                    template: '注册失败',
                    duration: 1000
                  })
                  $scope.logStatus = '连接超时！'
                })
              }
            }, function () {
              $ionicLoading.show({
                template: '注册失败',
                duration: 1000
              })
              $scope.logStatus = '连接超时！'
            })
          } else if (setPassState == 'reset') {
            // 如果是重置密码
            /**
             * [修改密码]
             * @Author   PXY
             * @DateTime 2017-07-04
             * @param    {phoneNo:String，password:String}
             * @return   data:Object
             *           err
             */
            User.changePassword({phoneNo: Storage.get('USERNAME'), password: setPassword.newPass}).then(function (data) {
              if (data.results == 0) {
                Storage.set('PASSWORD', setPassword.newPass)
                $scope.logStatus = '重置密码成功！'
                $timeout(function () { $state.go('signin') }, 500)
              } else {
                $scope.logStatus = '该账户不存在！'
              }
            }, function () {
              $scope.logStatus = '连接超时！'
            })
          }
        }
      } else {
        $scope.logStatus = '两次输入的密码不一致'
      }
    } else {
      $scope.logStatus = '请输入两遍新密码'
    }
  }
}])

// 个人信息--PXY
.controller('userdetailCtrl', ['$http', '$stateParams', '$scope', '$state', '$ionicHistory', '$timeout', 'Storage', '$ionicPopup', '$ionicLoading', '$ionicPopover', 'Dict', 'Patient', 'VitalSign', '$filter', 'Task', 'User', 'mySocket', function ($http, $stateParams, $scope, $state, $ionicHistory, $timeout, Storage, $ionicPopup, $ionicLoading, $ionicPopover, Dict, Patient, VitalSign, $filter, Task, User, mySocket) {
  // 页面绑定数据初始化
  $scope.User =
  {
    userId: null,
    name: null,
    gender: null,
    bloodType: null,
    hypertension: null,
    class: null,
    class_info: null,
    height: null,
    weight: null,
    birthday: null,
    IDNo: null,
    allergic: null,
    operationTime: null,
    lastVisit: {
      time: null,
      hospital: null,
      diagnosis: null
    }

  }
  /**
  * [进入页面之前完成个人信息的初始化,]
  * @Author   PXY
  * @DateTime 2017-07-05
  */
  $scope.$on('$ionicView.beforeEnter', function () {
    // showProgress为真显示疾病进程（自由文本）
    $scope.showProgress = false
    // showSurgicalTime为真显示手术时间（时间控件）
    $scope.showSurgicalTime = false
    // Diseases为疾病类型
    $scope.Diseases = ''
    // DiseaseDetails为疾病进程
    $scope.DiseaseDetails = ''
    // timename为手术时间（时间控件）的名称
    $scope.timename = ''
    initialPatient()
  })
  /**
  * [点击返回，如果上一个页面是“我的”并且当前是编辑状态，则变为不可编辑状态，否则返回上一页]
  * @Author   PXY
  * @DateTime 2017-07-05
  */
  $scope.Goback = function () {
    if ($stateParams.last == 'mine' && $scope.canEdit == true) {
      $scope.canEdit = false
    } else {
      $ionicHistory.goBack()
    }
  }

  $scope.Genders =
  [
      {Name: '男', Type: 1},
      {Name: '女', Type: 2}
  ]

  $scope.BloodTypes =
  [
      {Name: 'A型', Type: 1},
      {Name: 'B型', Type: 2},
      {Name: 'AB型', Type: 3},
      {Name: 'O型', Type: 4},
      {Name: '不确定', Type: 5}
  ]

  $scope.Hypers =
  [
      {Name: '是', Type: 1},
      {Name: '否', Type: 2}
  ]

  /**
   * [从字典中搜索选中的对象]
   * @Author   PXY
   * @DateTime 2017-07-05
   * @param    code:String/Number  [字典中的编码，比如 1 或“stage_5”]
   * @param    array:Array [字典，数组存了对象，对象中包含名称和对应的值]
   * @return   object/ '未填写'        [根据字典编码在字典中搜索到的对象]
   */
  var searchObj = function (code, array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].Type == code || array[i].type == code || array[i].code == code) return array[i]
    };
    return '未填写'
  }
  /**
   * [根据选择的疾病类型判断显示疾病进程还是手术时间控件（以及时间控件的名称）]
   * @Author   PXY
   * @DateTime 2017-07-05
   * @param    Disease:Object {typeName:String,type:String} [疾病类型]
   */
  $scope.getDiseaseDetail = function (Disease) {
    if (Disease.typeName == '肾移植') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '手术日期'
    } else if (Disease.typeName == '血透') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '插管日期'
    } else if (Disease.typeName == '腹透') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '开始日期'
    } else if (Disease.typeName == 'ckd5期未透析') {
      $scope.showProgress = false
      $scope.showSurgicalTime = false
    } else {
      $scope.showProgress = true
      $scope.showSurgicalTime = false
      $scope.DiseaseDetails = Disease.details
    }
  }

  /**
   * [点击编辑按钮，页面变为可编辑状态]
   * @Author   PXY
   * @DateTime 2017-07-05
   */
  $scope.edit = function () {
    $scope.canEdit = true
  }
  /**
   * [从数据库读取个人信息并完成初始化]
   * @Author   PXY
   * @DateTime 2017-07-05
   */
  var initialPatient = function () {
    /**
     * [从数据库读取个人信息绑定数据,如果没填个人信息且上一页面是“我的”，页面不可编辑]
     * @Author   PXY
     * @DateTime 2017-07-05
     * @param    {userId:String}
     */
    Patient.getPatientDetail({userId: Storage.get('UID')}).then(function (data) {
      if (data.results && data.results != '没有填写个人信息') {
        if ($stateParams.last == 'mine') {
          $scope.canEdit = false
        }
        $scope.User = data.results
        // 避免最近就诊信息没填，上一步赋值造成lastVist未定义
        if (!data.results.lastVisit) {
          $scope.User.lastVisit = {time: null, hospital: null, diagnosis: null}
        }

        if ($scope.User.gender != null) {
          $scope.User.gender = searchObj($scope.User.gender, $scope.Genders)
        }
        if ($scope.User.bloodType != null) {
          $scope.User.bloodType = searchObj($scope.User.bloodType, $scope.BloodTypes)
        }
        if ($scope.User.hypertension != null) {
          $scope.User.hypertension = searchObj($scope.User.hypertension, $scope.Hypers)
        }
        /**
         * [读取最新一条体重信息，后端方法改了（读取个人信息时一并把体重传回）这函数不需要了]
         * @Author   PXY
         * @DateTime 2017-07-05
         * @param    {userId:String,type:String} 注：type写死'Weight'
         * @return   data：{results:[{data:[{time:Date,value:Number}],...}]}    [外层数组results以天为单位,里层数组data以次数为单位]
         */
        VitalSign.getVitalSigns({userId: Storage.get('UID'), type: 'Weight'}).then(function (data) {
          if (data.results.length) {
            var n = data.results.length - 1
            var m = data.results[n].data.length - 1
            $scope.User.weight = data.results[n].data[m] ? data.results[n].data[m].value : ''
                              // console.log($scope.BasicInfo)
          }
        }, function (err) {
          console.log(err)
        })
      } else {
        $scope.canEdit = true
      }
      /**
       * [从字典表获取疾病类型]
       * @Author   PXY
       * @DateTime 2017-07-05
       * @param    {category：String}  注：疾病类型对应category为'patient_class'
       * @return   data:{
                    "results": [
                                  {
                                      "_id": "58dcfa48e06bc54b27bf599c",
                                      "category": "patient_class",
                                      "content": [
                                          {
                                              "details": [
                                                  {
                                                      "invalidFlag": 0,
                                                      "description": "5",
                                                      "inputCode": "",
                                                      "name": "疾病活跃期",
                                                      "code": "stage_5"
                                                  },
                                                  {
                                                      "invalidFlag": 0,
                                                      "description": "6",
                                                      "inputCode": "",
                                                      "name": "稳定期",
                                                      "code": "stage_6"
                                                  }
                                              ],
                                              "typeName": "ckd3-4期",
                                              "type": "class_3"
                                          },...
                                      ],
                                      "contents": []
                                  }
                            ]
                      }
       */
      Dict.getDiseaseType({category: 'patient_class'}).then(function (data) {
        // push和shift是为了肾移植排在前面
        $scope.Diseases = data.results[0].content
        $scope.Diseases.push($scope.Diseases[0])
        $scope.Diseases.shift()
        if ($scope.User.class != null) {
                          // console.log($scope.User.class);
                          // console.log($scope.Diseases);
          $scope.User.class = searchObj($scope.User.class, $scope.Diseases)
          if ($scope.User.class.typeName == '血透') {
            $scope.showProgress = false
            $scope.showSurgicalTime = true
            $scope.timename = '插管日期'
          } else if ($scope.User.class.typeName == '肾移植') {
            $scope.showProgress = false
            $scope.showSurgicalTime = true
            $scope.timename = '手术日期'
          } else if ($scope.User.class.typeName == '腹透') {
            $scope.showProgress = false
            $scope.showSurgicalTime = true
            $scope.timename = '开始日期'
          } else if ($scope.User.class.typeName == 'ckd5期未透析') {
            $scope.showProgress = false
            $scope.showSurgicalTime = false
          } else {
            $scope.showProgress = true
            $scope.showSurgicalTime = false
            $scope.DiseaseDetails = $scope.User.class.details
            console.log($scope.User.class)
            $scope.User.class_info = searchObj($scope.User.class_info[0], $scope.DiseaseDetails)
          }
        }
                          // console.log($scope.Diseases)
      }, function (err) {
        console.log(err)
      })
            // console.log($scope.User)
    }, function (err) {
      console.log(err)
    })
  }
  // 可以考虑封装一下，日期设置太多了
  // --------datepicker设置----------------
  var monthList = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  var weekDaysList = ['日', '一', '二', '三', '四', '五', '六']

  // --------诊断日期----------------
  var DiagnosisdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject1.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
          // 日期的存储格式和显示格式不一致
      $scope.User.lastVisit.time = yyyy + '-' + m + '-' + d
    }
  }

  $scope.datepickerObject1 = {
    titleLabel: '诊断日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    inputDate: new Date(),    // Optional
    mondayFirst: false,    // Optional
        // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      DiagnosisdatePickerCallback(val)
    }
  }
  // --------手术日期----------------
  var OperationdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject2.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.User.operationTime = yyyy + '-' + m + '-' + d
    }
  }
  $scope.datepickerObject2 = {
    titleLabel: '手术日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    mondayFirst: false,    // Optional
        // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      OperationdatePickerCallback(val)
    }
  }
  // --------出生日期----------------
  var BirthdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject3.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
          // 日期的存储格式和显示格式不一致
      $scope.User.birthday = yyyy + '-' + m + '-' + d
    }
  }
  $scope.datepickerObject3 = {
    titleLabel: '出生日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    mondayFirst: false,    // Optional
      // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      BirthdatePickerCallback(val)
    }
  }
  // --------datepicker设置结束----------------

  /**
   * [计算当前时间和usertime差几个月]
   * @Author   PXY
   * @DateTime 2017-07-05
   * @param    usertime:String [可解析的日期字符串]
   * @return   Number [相差月份数，floor取整]
   */
  var MonthInterval = function (usertime) {
    interval = new Date().getTime() - Date.parse(usertime)
    return (Math.floor(interval / (24 * 3600 * 1000 * 30)))
  }
  /**
   * [根据疾病类型、疾病进程或手术时间判断病人相应的任务模板，可考虑让后端在保存个人信息时完成]
   * @Author   PXY
   * @DateTime 2017-07-05
   * @param    kidneyType：String   [疾病类型，字典表编码]
   * @param    kidneyTime:String   [手术时间，可解析的日期字符串]
   * @param    kidneyDetail：String [疾病进程，字典表编码]
   * @return   SortNo:Number                [任务模板的编号]
   */
  var distinctTask = function (kidneyType, kidneyTime, kidneyDetail) {
    var sortNo = 1
    if (kidneyDetail) {
      var kidneyDetail = kidneyDetail[0]
    }
    switch (kidneyType) {
      case 'class_1':
                // 肾移植
        if (kidneyTime != undefined && kidneyTime != null && kidneyTime != '') {
          var month = MonthInterval(kidneyTime)
          console.log('month' + month)
          if (month >= 0 && month < 3) {
            sortNo = 1// 0-3月
          } else if (month >= 3 && month < 6) {
            sortNo = 2 // 3-6个月
          } else if (month >= 6 && month < 36) {
            sortNo = 3 // 6个月到3年
          } else if (month >= 36) {
            sortNo = 4// 对应肾移植大于3年
          }
        } else {
          sortNo = 4
        }
        break
      case 'class_2': case 'class_3':// 慢性1-4期
        if (kidneyDetail != undefined && kidneyDetail != null && kidneyDetail != '') {
          if (kidneyDetail == 'stage_5') { // "疾病活跃期"
            sortNo = 5
          } else if (kidneyDetail == 'stage_6') { // "稳定期
            sortNo = 6
          } else if (kidneyDetail == 'stage_7') { // >3年
            sortNo = 7
          }
        } else {
          sortNo = 6
        }
        break

      case 'class_4':// 慢性5期
        sortNo = 8
        break
      case 'class_5':// 血透
        sortNo = 9
        break

      case 'class_6':// 腹透
        if (kidneyTime != undefined && kidneyTime != null && kidneyTime != '') {
          var month = MonthInterval(kidneyTime)
          console.log('month' + month)
          if (month < 6) {
            sortNo = 10
          } else {
            sortNo = 11
          }
        }
        break
    }
    return sortNo
  }
  /**
   * [修改病人的个人信息]
   * @Author   PXY
   * @DateTime 2017-07-05
   */
  var editPatientInfo = function () {
    // 非引用赋值，避免保存时更改了选择输入select的值时对应项显示空白
    var userInfo = $.extend(true, {}, $scope.User)
    userInfo.gender = userInfo.gender.Type
    userInfo.bloodType = userInfo.bloodType.Type
    userInfo.hypertension = userInfo.hypertension.Type
    if (userInfo.class.typeName == 'ckd5期未透析') {
      userInfo.class_info == null
    } else if (userInfo.class_info != null) {
      userInfo.class_info = userInfo.class_info.code
    }
    userInfo.class = userInfo.class.type
        // console.log($scope.User);
        // console.log(userInfo);
    var patientId = Storage.get('UID')
    userInfo.userId = patientId
    /**
     * [调用后端方法修改病人的个人信息]
     * @Author   PXY
     * @DateTime 2017-07-05
     * @param    userInfo:Object [属性和$scope.User一致，只是把需要选择输入的那几个字段比如性别的值从对象改为了对象中的编码]
     * @return   data:Object  {result:String,...}
     *           err
     */
    Patient.editPatientDetail(userInfo).then(function (data) {
      if (data.result == '修改成功') {
        console.log(data.results)
        var task = distinctTask(data.results.class, data.results.operationTime, data.results.class_info)
        /**
         * [修改病人的任务模板]
         * @Author   PXY
         * @DateTime 2017-07-05
         * @param    {userId:String, sortNo:Number}
         * @return   data:Object  {result:String,...}
         *           err
         */
        Task.insertTask({userId: patientId, sortNo: task}).then(function (data) {
          if (data.result == '插入成功') {
            if ($stateParams.last == 'mine') {
              $scope.canEdit = false
                            // initialPatient();
            } else if ($stateParams.last == 'tasklist' || $stateParams.last == 'consult') {
                            // console.log('goBack1');
              $ionicHistory.goBack()
            }
                        // }
          }
        }, function (err) {
          console.log('err' + err)
        })
      }
    }, function (err) {
      console.log(err)
    })
  }
  /**
   * [点击保存个人信息，弹窗提示用户并在其点击确定后修改个人信息]
   * @Author   PXY
   * @DateTime 2017-07-05
   */
  $scope.infoSetup = function () {
    $ionicPopup.show({
      template: '肾病类型及高血压等诊断信息的修改会影响肾病管理方案，建议在医生指导下修改，请谨慎！',
      title: '保存确认',
                      // subTitle: '2',
      scope: $scope,
      buttons: [
        {
          text: '取消',
          type: 'button-small',
          onTap: function (e) {}
        },
        {
          text: '确定',
          type: 'button-small button-positive ',
          onTap: function (e) { editPatientInfo() }
        }
      ]
    })
  }
}])

// 主页面--PXY
.controller('TabsCtrl', ['$ionicHistory', '$interval', 'News', 'Storage', '$scope', '$timeout', '$state', function ($ionicHistory, $interval, News, Storage, $scope, $timeout, $state) {
  /**
   * [点击消息中心按钮，跳转消息中心并记住跳转前的页面state]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.GoToMessage = function () {
    Storage.set('messageBackState', $ionicHistory.currentView().stateId)
    $state.go('messages')
  }
  // 点击“我的” tab
  $scope.gotomine = function () {
    $state.go('tab.mine')
  }
  // 点击“咨询” tab
  $scope.gotomyDoctors = function () {
    $state.go('tab.myDoctors')
  }

  /**
   * [切换tab时取消消息轮询，避免出现两个消息轮询]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.cancelGetMessage = function () {
    // console.log('cancel')
    if (RefreshUnread) {
      $interval.cancel(RefreshUnread)
    };
  }
}])

// 任务列表--GL
.controller('tasklistCtrl', ['$interval', 'News', 'otherTask', '$scope', '$timeout', '$state', 'Storage', '$ionicHistory', '$ionicPopup', '$ionicModal', 'Compliance', '$window', 'Task', 'Patient', 'VitalSign', function ($interval, News, otherTask, $scope, $timeout, $state, Storage, $ionicHistory, $ionicPopup, $ionicModal, Compliance, $window, Task, Patient, VitalSign) {
  $scope.goinsurance = function () {
    $state.go('insurance')
  }
  // 初始化
  var UserId = Storage.get('UID')
    // UserId = "Test13"; //

  $scope.Tasks = {} // 任务
  $scope.HemoBtnFlag = false // 血透排班设置标志
  var OverTimeTaks = []
  var index = 0
  var dateNowStr = ChangeTimeForm(new Date()) // 方便设定当前日期进行调试，或是之后从数据库获取当前日期

  var GetUnread = function () {
        // console.log(new Date());
    News.getNewsByReadOrNot({userId: Storage.get('UID'), readOrNot: 0, userRole: 'patient'}).then(//
            function (data) {
                // console.log(data);
              if (data.results.length) {
                $scope.HasUnreadMessages = true
                    // console.log($scope.HasUnreadMessages);
              } else {
                $scope.HasUnreadMessages = false
              }
            }, function (err) {
      console.log(err)
    })
  }

  $scope.$on('$ionicView.enter', function () {
    GetTasks()
    RefreshUnread = $interval(GetUnread, 2000)
  })

  $scope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {
    if (toState.name !== 'tab.myDoctors' && toState.name !== 'tab.forum' && toState.name !== 'tab.mine' && toState.name !== 'tab.tasklist') {
      if (RefreshUnread) {
        $interval.cancel(RefreshUnread)
      };
    }
  })

  // 判断是否需要修改任务时间
  //输入：任务对象的开始时间，结束时间，单位，次数
  //输出：新的任务时间
  function IfTaskOverTime (startTime, frequencyTimes, unit, times) {
    var res = ''
    var days = GetDifDays(startTime, dateNowStr)
    if ((unit == '年') && (times == 2))// 一年2次
        {
      unit = '月'
      frequencyTimes = 6
    }
    var tbl = {'周': 7, '月': 30, '年': 365}
    var someDays = tbl[unit] * frequencyTimes
    if (days < 0) {
      while (days < -someDays) // 若长时间未使用APP使日期错过了下次任务，则再往后延
            {
        startTime = ChangeTimeForm(SetNextTime(startTime, frequencyTimes, unit, times))
        days = GetDifDays(startTime, dateNowStr)
      }
      res = startTime
    }
        // console.log(res);
    return res
  }
   // IfTaskOverTime("2017-04-05", 1, "周",1 );

  // 当前日期与默认日期比较，自动修改填写状态
  //输入：任务对象
  //输出：无
  function CompDateToDefault (task) {
    var res = false
    var freqTimes = task.frequencyTimes
    var unit = task.frequencyUnits
    var times = task.frequencyTimes
    var dateNow = new Date(dateNowStr)
    var dateStart = new Date(task.startTime)
    if (times == 1) // 只对周期内1次任务有效
      {
      if (unit == '周') {
        var weekDayNow = dateNow.getDay()
        var days = GetDifDays(task.startTime, dateNowStr)
        if ((weekDayNow >= 1) && (days < 7))// 已过周一
              {
          res = true
        }
      } else if (unit == '月') {
        var monthNow = dateNow.getMonth()
        var monthStart = dateStart.getMonth()
        if (monthNow == monthStart) {
          res = true
        }
      } else // 年
          {
        var yearNow = dateNow.getFullYear()
        var yearStart = dateStart.getFullYear()
        if (yearNow == yearStart) {
          res = true
        }
      }
    }
    task.Flag = !res
  }
   // CompDateToDefault({});

  // 获取对应任务模板
  //输入：无
  //输出：无
  function GetTasks () {
    var promise = Task.getUserTask({userId: UserId})
    promise.then(function (data) {
      console.log(data)
      if (data.result) {
        $scope.unCompleted = false
        $scope.Tasks = data.result.task
        HandleTasks()
      } else {
        $scope.unCompleted = true
      }
    }, function () {

    })
  }

  // 获取模板后进行处理
  //输入：无
  //输出：无
  function HandleTasks () {
    $scope.Tasks.Other = []
    $scope.Tasks.Hemo = []
    for (var i = 0; i < $scope.Tasks.length; i++) {
      var task = $scope.Tasks[i]
           // console.log(task);
      if (task.type == 'Measure') {
        InitialEveTask(task)
      } else // 其他任务
           {
        InitialOtherTask(task)
      }
    }
    //console.log($scope.Tasks.Measure)
    //console.log($scope.Tasks.Other)
    $scope.Tasks.Other.sort(SortByTime) // 按时间先后排序
    for (var i = 0; i < $scope.Tasks.Other.length; i++) {
      if ($scope.Tasks.Other[i].frequencyTimes == 0)// 只执行一次的任务置顶
            {
        var item = $scope.Tasks.Other[i]
        $scope.Tasks.Other.splice(i, 1)
        $scope.Tasks.Other.unshift(item)
      }
    }
    GetDoneTask()
     // console.log($scope.Tasks);
  }

  // 初始化每日任务
  //输入：任务对象
  //输出：无
  function InitialEveTask (task) {
    $scope.Tasks.Measure = task.details
    for (var i = 0; i < $scope.Tasks.Measure.length; i++) {
      $scope.Tasks.Measure[i].type = 'Measure'
      if ($scope.Tasks.Measure[i].frequencyUnits == '天')// 限定每日完成的任务
            {
        $scope.Tasks.Measure[i].Name = NameMatch($scope.Tasks.Measure[i].code)
        $scope.Tasks.Measure[i].Unit = UnitMatch($scope.Tasks.Measure[i].code)
        $scope.Tasks.Measure[i].Range = RangeMatch($scope.Tasks.Measure[i].code)
        $scope.Tasks.Measure[i].Freq = $scope.Tasks.Measure[i].frequencyTimes + $scope.Tasks.Measure[i].frequencyUnits + $scope.Tasks.Measure[i].times + $scope.Tasks.Measure[i].timesUnits
        $scope.Tasks.Measure[i].Flag = false
        if ($scope.Tasks.Measure[i].times > 1) {
          $scope.Tasks.Measure[i].TimesFlag = true
          $scope.Tasks.Measure[i].Progress = '0'
        } else {
          $scope.Tasks.Measure[i].TimesFlag = false
        }
      } else // 测量中的非每日任务 加入Other并从测量中去除（即血管通路情况）
            {
        var newTask = $scope.Tasks.Measure[i]
        HandlOtherTask(newTask, task)
        $scope.Tasks.Measure.splice(i, 1)
      }
    }
  }

  // 初始化血透任务
  //输入：任务对象
  //输出：无
  function InitialHemoTask (task) {
    task.type = 'ReturnVisit'
    if (task.content == '') // 未设定排班时间
        {
      $scope.HemoBtnFlag = true
    } else {
      task.DateStr = task.content
      $scope.HemoBtnFlag = false
      var StartArry = task.DateStr.split('+')[0].split(',')
      var EndArry = []
      task.Flag = false
      task.Progress = '0'
      if (task.DateStr.split('+')[2]) {
        task.endTime = task.DateStr.split('+')[2]
        EndArry = task.DateStr.split('+')[2].split(',')
        task.Progress = (Math.round(EndArry.length / task.times * 10000) / 100).toFixed(2) + '%' // 进度条
        if (EndArry.length == task.times) {
          task.Flag = true
        }
      } else {
        task.endTime = ''
      }
            // 判定是否为新的一周以更新任务日期
      var days = GetDifDays(dateNowStr, StartArry[0])
      if (days >= 7) {
        task.Flag = false
        while (days >= 7) {
          for (var i = 0; i < StartArry.length; i++) {
            StartArry[i] = ChangeTimeForm(SetNextTime(StartArry[i], task.frequencyTimes, task.frequencyUnits, task.times))
          }
          days = GetDifDays(dateNowStr, StartArry[0])
        }
        task.DateStr = GetHemoStr(StartArry, task.DateStr.split('+')[1], [])
                // 修改数据库
        item = {
          'userId': UserId,
          'type': task.type,
          'code': task.code,
          'instruction': task.instruction,
          'content': task.DateStr,
          'startTime': '2050-11-02T07:58:51.718Z',
          'endTime': '2050-11-02T07:58:51.718Z',
          'times': task.times,
          'timesUnits': task.timesUnits,
          'frequencyTimes': task.frequencyTimes,
          'frequencyUnits': task.frequencyUnits
        }
        UpdateUserTask(item)  // 更改任务下次执行时间
      }
      task.Name = '血透'
      task.startTime = task.DateStr.split('+')[0]
      $scope.Tasks.Hemo.push(task)
            // console.log( $scope.Tasks.Hemo);
    }
  }

  // 初始化其他任务
  //输入：任务对象
  //输出：无
  function InitialOtherTask (task) {
    for (var i = 0; i < task.details.length; i++) {
      var newTask = task.details[i]
      if ((task.type == 'ReturnVisit') && (newTask.code == 'stage_9'))// 血透排班
            {
        InitialHemoTask(newTask)
      } else {
        HandlOtherTask(newTask, task)
      }
    }
    if (OverTimeTaks.length != 0) {
      ChangeOverTime()// 过期任务新任务时间插入数据库
    }
  }

  // 处理其他任务详细
  //输入：任务对象，任务对象（前者是后者的一个项）
  //输出：无
  function HandlOtherTask (newTask, task) {
    newTask.Flag = false
    newTask.DoneFlag = false
    newTask.type = task.type
    newTask.Name = NameMatch(newTask.type)
    if (newTask.type == 'Measure') // 血管通路情况
      {
      newTask.Name = NameMatch(newTask.code)
    }
    newTask.Freq = newTask.frequencyTimes + newTask.frequencyUnits + newTask.times + newTask.timesUnits
    if ((newTask.type == 'LabTest') && (newTask.code == 'LabTest_9')) {
      newTask.Freq = '初次评估'
    }
    if (newTask.endTime != '2050-11-02T07:58:51.718Z') // 显示已执行时间
      {
      newTask.Flag = true
      newTask.DoneFlag = true
      newTask.endTime = newTask.endTime.substr(0, 10)
    }

    var TimeCompare = IfTaskOverTime(newTask.startTime, newTask.frequencyTimes, newTask.frequencyUnits, newTask.times) // 错过任务执行时间段，后延
    if (TimeCompare != '') {
      newTask.startTime = TimeCompare
      newTask.Flag = false
      OverTimeTaks.push(newTask)
    } else {
      var days = GetDifDays(newTask.startTime, dateNowStr)
      if (days <= 0) {
        newTask.Flag = false
      } else {
        if (newTask.Flag) // 到默认时间修改填写状态
           {
          CompDateToDefault(newTask)
        }
      }
    }
    $scope.Tasks.Other.push(newTask)
  }

  // 批量更新任务
  //输入：无
  //输出：无
  function ChangeOverTime () {
    var temp = OverTimeTaks[index]
    var task = {
      'userId': UserId,
      'type': temp.type,
      'code': temp.code,
      'instruction': temp.instruction,
      'content': temp.content,
      'startTime': temp.startTime,
      'endTime': temp.endTime,
      'times': temp.times,
      'timesUnits': temp.timesUnits,
      'frequencyTimes': temp.frequencyTimes,
      'frequencyUnits': temp.frequencyUnits
    }
    var promise = Task.updateUserTask(task)
    promise.then(function (data) {
      if (data.results) {
        index = index + 1
        if (index < OverTimeTaks.length) {
          ChangeOverTime()
        }
      };
    }, function () {
    })
  }

  // 获取今日已执行任务
  //输入：无
  //输出：无
  function GetDoneTask () {
    var nowDay = dateNowStr
    var promise = Compliance.getcompliance({userId: UserId, date: nowDay})
    promise.then(function (data) {
      if (data.results) {
        for (var i = 0; i < data.results.length; i++) {
          AfterDoneTask(data.results[i], 'GET')
        }
      }
           // console.log(data.results);
      ChangeLongFir()// 修改长周期任务第一次执行时间
    }, function () {
    })
  }

  // 获取今日已执行任务后进行处理(falg用于区分获取还是新插入已执行任务)
  //输入：任务对象，标志位（POST/GET)
  //输出：无
  function AfterDoneTask (doneTask, flag) {
      // 确定任务是否完成，修改显示标志位，获取已填写的数值并在页面显示
    var Code = doneTask.code
    var Description = doneTask.description
    console.log(doneTask)
    EveTaskDone(doneTask, flag)
    if (flag == 'POST') {
      if ((doneTask.type == 'ReturnVisit') && (doneTask.code == 'stage_9')) // 血透排班
          {
        $scope.Tasks.Hemo[0].instruction = Description
        HemoTaskDone($scope.Tasks.Hemo[0])
      } else {
        for (var i = 0; i < $scope.Tasks.Other.length; i++) {
          var task = $scope.Tasks.Other[i]
          if (task.code == Code) {
            //console.log(task)
            OtherTaskDone(task, Description)
            break
          }
        }
      }
    }
  }

  // 每日任务执行后处理
  //输入：任务对象，标志位（POST/GET）
  //输出：无
  function EveTaskDone (doneTask, flag) {
        // 或许只是测量任务才会进行处理？
    var Code = doneTask.code
    var Description = doneTask.description
    var flag1 = false
    for (var i = 0; i < $scope.Tasks.Measure.length; i++) {
      if ($scope.Tasks.Measure[i].code == Code) {
        $scope.Tasks.Measure[i].instruction = Description
        flag1 = true
        var num = i
        if ($scope.Tasks.Measure[i].times == 1) // 每天一次
                {
          $scope.Tasks.Measure[i].Flag = true
        } else // 多次(修改进度条)
                {
          var ValueArry = Description.split('，')
                    // console.log(ValueArry);
          if (ValueArry.length == $scope.Tasks.Measure[i].times) {
            $scope.Tasks.Measure[i].Flag = true
            $scope.Tasks.Measure[i].DoneTimes = ValueArry.length
          }
          $scope.Tasks.Measure[i].Progress = (Math.round(ValueArry.length / $scope.Tasks.Measure[i].times * 10000) / 100).toFixed(2) + '%'
        }
        break
      }
    }
    if (flag1) // 插入体征表
        {
      if ((flag == 'POST') && (VitalSignTbl[$scope.Tasks.Measure[num].code])) {
        var task = $scope.Tasks.Measure[num]
        if (task.code == 'BloodPressure')// console.log(task);
               {
          var array = Description.split('，')
          var i = array.length
          var temp = {
            'patientId': UserId,
            'type': VitalSignTbl[task.code].type,
            'code': VitalSignTbl[task.code].code,
            'date': dateNowStr,
            'datatime': new Date(),
            'datavalue': array[i - 1].split('/')[0],
            'datavalue2': array[i - 1].split('/')[1],
            'unit': task.Unit
          }
        } else {
          var array = Description.split('，')
          var i = array.length
          var temp = {
            'patientId': UserId,
            'type': VitalSignTbl[task.code].type,
            'code': VitalSignTbl[task.code].code,
            'date': dateNowStr,
            'datatime': new Date(),
            'datavalue': array[i - 1],
            'unit': task.Unit
          }
        }
        // debugger
        InsertVitalSign(temp)
      }
    }
  }

  // 其他任务后处理
  //输入：任务对象，描述（字符串，任务执行情况，如化验结果）
  //输出：无
  function OtherTaskDone (task, Description) {
    var NextTime = ''
    var item
        // var instructionStr = task.instruction;//避免修改模板 暂时就让它修改吧
    task.instruction = Description // 用于页面显示
    console.log('attention')
    console.log(task.endTime)
    task.Flag = true
    task.endTime = task.endTime.substr(0, 10)
    if (task.endTime != '2050-11-02T07:58:51.718Z') // 说明任务已经执行过
        {
      task.DoneFlag = true
    } else {
      task.DoneFlag = false
    }
    NextTime = ChangeTimeForm(SetNextTime(task.startTime, task.frequencyTimes, task.frequencyUnits, task.times))
    task.startTime = NextTime// 更改页面显示
    task.endTime = dateNowStr
    item = {
      'userId': UserId,
      'type': task.type,
      'code': task.code,
      'instruction': task.instruction,
      'content': task.content,
      'startTime': NextTime,
      'endTime': task.endTime,
      'times': task.times,
      'timesUnits': task.timesUnits,
      'frequencyTimes': task.frequencyTimes,
      'frequencyUnits': task.frequencyUnits
    }
    console.log(item)
    UpdateUserTask(item)  // 更改任务下次执行时间
  }

  // 血透任务执行后处理
  //输入：任务对象，标志位（貌似无用）
  //输出：无
  function HemoTaskDone (task, flag) {
       // console.log(task);
    var dateStr = task.DateStr
    var StartArry = dateStr.split('+')[0].split(',')
    var Mediean = dateStr.split('+')[1]
    var EndArry = []
    var content
    if (dateStr.split('+')[2]) {
      EndArry = dateStr.split('+')[2].split(',')
    }
    var instructionArry = task.instruction.split('，')
    if (instructionArry.length > EndArry.length) // 判断是添加还是修改，修改不加次数
       {
      var newEnd = dateNowStr
      EndArry.push(newEnd)
      task.Progress = (Math.round(EndArry.length / task.times * 10000) / 100).toFixed(2) + '%' // 更新进度条
    }

    if (EndArry.length == task.times) {
      task.Flag = true
    }
    content = GetHemoStr(StartArry, Mediean, EndArry)

        // 更新任务完成时间

    task.endTime = EndArry.join(',')
    task.DateStr = GetHemoStr(StartArry, Mediean, EndArry)

        // 更新任务模板
    item = {
      'userId': UserId,
      'type': task.type,
      'code': task.code,
      'instruction': task.instruction,
      'content': task.DateStr,
      'startTime': '2050-11-02T07:58:51.718Z',
      'endTime': '2050-11-02T07:58:51.718Z',
      'times': task.times,
      'timesUnits': task.timesUnits,
      'frequencyTimes': task.frequencyTimes,
      'frequencyUnits': task.frequencyUnits
    }
    //console.log(item)
    UpdateUserTask(item)
  }

  // 血透字符串组装
  //输入：开始数组，中间字符串，结尾数组
  //输出：组装后的字符串
  function GetHemoStr (startArry, mediean, endArry) {
    var res = ''
    res = startArry.join(',') + '+' + mediean
    if (endArry.length != 0) {
      res = res + '+' + endArry.join(',')
    }
    return res
  }

  // 名称转换
  function NameMatch (name) {
    var Tbl = [
                 {Name: '体温', Code: 'Temperature'},
                 {Name: '体重', Code: 'Weight'},
                 {Name: '血压', Code: 'BloodPressure'},
                 {Name: '尿量', Code: 'Vol'},
                 {Name: '心率', Code: 'HeartRate'},
                 {Name: '复诊', Code: 'ReturnVisit'},
                 {Name: '化验', Code: 'LabTest'},
                 {Name: '特殊评估', Code: 'SpecialEvaluate'},
                 {Name: '血管通路情况', Code: 'VascularAccess'},
                 {Name: '腹透', Code: 'PeritonealDialysis'},
                 {Name: '超滤量', Code: 'cll'},
                 {Name: '浮肿', Code: 'ywfz'},
                 {Name: '引流通畅', Code: 'yl'}
    ]
    for (var i = 0; i < Tbl.length; i++) {
      if (Tbl[i].Code == name) {
        name = Tbl[i].Name
        break
      }
    }
    return name
  }

  // 单位匹配
  //输入：编码
  //输出：对应单位
  function UnitMatch (code) {
    var Unit = ''
    var Tbl = [
                 {Code: 'Temperature', Unit: '摄氏度'},
                 {Code: 'Weight', Unit: 'kg'},
                 {Code: 'BloodPressure', Unit: 'mmHg'},
                 {Code: 'Vol', Unit: 'mL'},
                 {Code: 'HeartRate', Unit: '次/分'},
                 {Code: 'cll', Unit: 'mL'}
    ]
    for (var i = 0; i < Tbl.length; i++) {
      if (Tbl[i].Code == code) {
        Unit = Tbl[i].Unit
        break
      }
    }
    return Unit
  }

  // 范围匹配
  //输入：编码
  //输出：数值范围（对象，包括最大值和最小值）
  function RangeMatch (code) {
    var res = {}
    var Tbl = [
                 {Code: 'Temperature', Min: 35, Max: 42},
                 {Code: 'Weight', Min: 0, Max: 300},
                 {Code: 'BloodPressure', Min: 0, Max: 250},
                 {Code: 'Vol', Min: 0, Max: 5000},
                 {Code: 'HeartRate', Min: 30, Max: 200}
    ]
    for (var i = 0; i < Tbl.length; i++) {
      if (Tbl[i].Code == code) {
        res.Min = Tbl[i].Min
        res.Max = Tbl[i].Max
        break
      }
    }
    return res
  }

  // 时间比较排序
  //输入：任务对象，任务对象
  //输出：整数（可正可负）
  function SortByTime (a, b) {
    var res = 0
    var strA = a.startTime.substr(0, 10).replace(/-/g, '')
    var strB = b.startTime.substr(0, 10).replace(/-/g, '')
    if ((!isNaN(strA)) && (!isNaN(strB))) {
      res = parseInt(strA) - parseInt(strB)
    }
    return res
  }

  // 比较时间天数
  //输入：日期字符串，日期字符串
  //输出：两日期相差天数
  function GetDifDays (date1Str, date2Str) {
    res = 0
    var date1 = new Date(date1Str)
    var date2 = new Date(date2Str)
    if ((date1 instanceof Date) && (date2 instanceof Date)) {
      days = date1.getTime() - date2.getTime()
      res = parseInt(days / (1000 * 60 * 60 * 24))
    }
    return res
  }

  // 比较下次任务时间与当前时间
  //输入：任务对象的开始时间，频率次数，单位，次数
  //输出：对象（包括标志位和字符串日期）
  function CompareTime (startTime, frequencyTimes, unit, times) {
    var res = {'Flag': false, 'Date': ''}
    var date1 = new Date(dateNowStr)
    var date2 = new Date(startTime)
    var days = date2.getTime() - date1.getTime()

    while (days < 0) // 若长时间未使用APP使日期错过了下次任务，则再往后延
        {
      date2 = SetNextTime(date2.toString(), frequencyTimes, unit, times)
      days = date2.getTime() - date1.getTime()
      res.Date = ChangeTimeForm(date2)
    } var day = parseInt(days / (1000 * 60 * 60 * 24))
    if (day <= 7) {
      res.Flag = true
    }
    return res
  }
   // CompareTime("2017-06-24", 2, "周", 1);

  // 插入任务执行情况
  //输入：任务对象
  //输出：无
  function Postcompliance (task) {
    console.log(task)
    var promise = Compliance.postcompliance(task)
    promise.then(function (data) {
      console.log(data)
      if (data.results) {
              // console.log(data.results);
        AfterDoneTask(data.results, 'POST')
      }
    }, function () {
    })
  }

  // 插入体征数据
  //输入：任务对象
  //输出：无
  function InsertVitalSign (task) {
    var promise = VitalSign.insertVitalSign(task)
    promise.then(function (data) {
      console.log(data)
      // debugger
      if (data.results) {
        console.log(data.results)
      }
    }, function (err) {
      //console.log(err)
    })
  }

  // 体征字典
  var VitalSignTbl = {'Temperature': {code: '体温', type: '体温'},
    'Weight': {code: '体重', type: '体重'},
    'BloodPressure': {code: '血压', type: '血压'},
    'Vol': {code: '尿量', type: '尿量'},
    'HeartRate': {code: '心率', type: '心率'}
  }

  // 更新用户任务模板
  //输入：任务对象
  //输出：无
  function UpdateUserTask (task) {
    var promise = Task.updateUserTask(task)
    promise.then(function (data) {
         // console.log(data);
      if (data.results) {
          // console.log(data.results);
      };
    }, function () {
    })
  }

  // 修改长期任务第一次时间
  //输入：无
  //输出：无
  function ChangeLongFir () {
        // 界面
    for (var i = 0; i < $scope.Tasks.Other.length; i++) {
      if ($scope.Tasks.Other[i].startTime == '2050-11-02T07:58:51.718Z') // 未设定时间时
          {
        $scope.Tasks.Other[i].startTime = SetTaskTime($scope.Tasks.Other[i].frequencyUnits, $scope.Tasks.Other[i].times)
      }
          // 注释掉了else那段不知道会不会有影响
          // else
          // {
             // $scope.Tasks.Other[i].startTime = $scope.Tasks.Other[i].startTime.substr(0,10);
          // }
          /* var item = $scope.Tasks.Other[i];  //先不管吧
          var CompRes = CompareTime(item.startTime, item.frequencyTimes, item.frequencyUnits, item.times);
          if(!CompRes.Flag)
          {
              $scope.Tasks.Other[i].Flag = true;
          } */
    }
        // 数据库
    for (var i = 0; i < $scope.Tasks.Other.length; i++) {
      if ($scope.Tasks.Other[i].startTime != '2050-11-02T07:58:51.718Z') // 修改任务执行时间
          {
        var temp = $scope.Tasks.Other[i]
        var task = {
          'userId': UserId,
          'type': temp.type,
          'code': temp.code,
          'instruction': temp.instruction,
          'content': temp.content,
          'startTime': temp.startTime,
          'endTime': temp.endTime,
          'times': temp.times,
          'timesUnits': temp.timesUnits,
          'frequencyTimes': temp.frequencyTimes,
          'frequencyUnits': temp.frequencyUnits
        }
        UpdateUserTask(task)
      }
    }
  }

  // 设定长期任务第一次时间
  //输入：类型（周/月/年），次数
  //输出：字符串日期
  function SetTaskTime (Type, Times) {
      // 暂时就用本地时间
    var CurrentDate = new Date(dateNowStr)
    var NewDate
    var WeekDay = CurrentDate.getDay() // 0-6 0为星期日
    var Day = CurrentDate.getDate() // 1-31
    var Month = CurrentDate.getMonth() // 0-11,0为1月

    var Num = 0
    if (Type == '周') {
      Num = 1// 默认周一

      if (Num >= WeekDay) // 所选日期未过，选择本星期
         {
        NewDate = new Date(CurrentDate.setDate(Day + Num - WeekDay))
      } else // 下个星期
         {
        NewDate = new Date(CurrentDate.setDate(Day + Num + 7 - WeekDay))
      }
    } else if (Type == '月') {
      Num = 1 // 默认1日
      NewDate = new Date(CurrentDate.setDate(Num))
      if (Num < Day) // 所选日期已过，选择下月
         {
        NewDate = new Date(CurrentDate.setMonth(CurrentDate.getMonth() + 1))
      }
    } else if (Type == '年') {
      if (Times == 2) // 一年2次 -- 6月1次
         {
        Num = 1
        NewDate = new Date(CurrentDate.setDate(Num))
        if (Num < Day) // 所选日期已过，选择下月
            {
          NewDate = new Date(CurrentDate.setMonth(CurrentDate.getMonth() + 1))
        }
      } else {
        Num = 0 // 默认1月
        NewDate = new Date(CurrentDate.setMonth(Num))
        if (Num < Month)// 所选日期已过，选择明年
             {
          NewDate = new Date(CurrentDate.setYear(CurrentDate.getFullYear() + 1))
        }
      }
    }
      // console.log(ChangeTimeForm(NewDate));
    return ChangeTimeForm(NewDate)
  }

  // 弹框格式
  var PopTemplate = {
    Input: '<input type="text" ng-model="data.value"><p ng-if = "data.alertFlag" style="color:red;">{{data.alertWords}}</P>',
    InputBP: '收缩压<input type="text" ng-model="data.value1"><p ng-if = "data.alertFlag1" style="color:red;">123{{data.alertWords1}}</P>' +
                                '舒张压<input type="text" ng-model="data.value2"><p ng-if = "data.alertFlag2" style="color:red;">{{data.alertWords2}}</P>',
    Textarea: '<textarea type="text" ng-model="data.value" rows="10" cols="100"></textarea>',
    Select: '<select ng-model = "data.value"><option >是</option><option >否</option></select>'
  }// Textarea：VascularAccess；

  // 测量弹窗
  //输入：任务对象，类型（fill/edit）
  //输出：弹窗
  $scope.showMesPop = function (task, type) {
        // 首先swipe-back

    $scope.data = {}
    $scope.data.alertFlag = false
      // console.log(task);
    var PopInfo = GetPopInfo('input', type, task)
    $scope.data.value = PopInfo.content
    var myPopup = $ionicPopup.show({
      template: PopInfo.Template,
      cssClass: 'popupWithKeyboard',
      title: PopInfo.word,
      scope: $scope,
      buttons: [
            { text: '取消' },
        {
          text: '保存',
          type: 'button-positive',
          onTap: function (e) {
            if (PopInfo.flag == 'InputBP') {
              if ((!$scope.data.value1) || (!$scope.data.value2)) {
                e.preventDefault()
              } else {
                var Range1 = AboutRange($scope.data.value1, task.code)
                var Range2 = AboutRange($scope.data.value2, task.code)
                var word1 = Range1.word
                var word2 = Range2.word
                if (word1 != '') {
                  $scope.data.alertWords1 = word1
                  $scope.data.alertFlag1 = true
                  e.preventDefault()
                } else if (word2 != '') {
                  $scope.data.alertWords2 = word2
                  $scope.data.alertFlag2 = true
                  e.preventDefault()
                } else {
                  if ((Range1.num > 140) || (Range2.num > 90)) {
                    $scope.showAlert()
                  }
                  return Range1.str + '/' + Range2.str
                }
              }
            } else {
              if (!$scope.data.value) {
                e.preventDefault()
              }
              if (PopInfo.flag == 'input') {
                var Range = AboutRange($scope.data.value, task.code)
                var word = Range.word
                if (word != '') {
                  $scope.data.alertWords = word
                  $scope.data.alertFlag = true
                  e.preventDefault()
                } else {
                  return Range.str
                }
              } else {
                console.log($scope.data.value)
                if (!$scope.data.value) {
                  e.preventDefault()
                } else {
                  return $scope.data.value
                }
              }
            }
          }
        }
      ]
    })
    myPopup.then(function (res) {
      if (res) {
        var Description = res
          // 向任务表中插入数据
        if ((task.frequencyUnits == '天') && (task.instruction != '')) {
          if (type == 'fill') {
            Description = task.instruction + '，' + Description // 若为一天多次的任务
          } else {
            var arry = task.instruction.split('，')
            arry[arry.length - 1] = res
            Description = arry.join('，')
          }
        }
        var item = {
          'userId': UserId,
          'type': task.type,
          'code': task.code,
          'date': dateNowStr,
          'status': 0,
          'description': Description
        }

          // console.log(item);
        Postcompliance(item)
      }
    })
  }

  // 弹窗标题、输入类型、显示内容
  //输入：标志位（input），类型（fill/eidt），任务对象
  //输出：对象（弹窗相关信息）
  function GetPopInfo (flag, type, task) {
    var res = {}
    var Template = PopTemplate.Input // 默认为输入框
    var word = '请填写' + task.Name + '(' + task.Unit + ')'
    var content = ''
    var instruction = task.instruction
    if ((task.code == 'ywfz') || (task.code == 'yl')) {
      flag = 'Select'
      Template = PopTemplate.Select
      if (task.code == 'ywfz') {
        word = '请选择是否浮肿'
      } else {
        word = '请选择引流是否通畅'
      }
      if (instruction != '') {
        content = instruction
      }
    } else if (task.code == 'BloodPressure') {
      flag = 'InputBP'
      Template = PopTemplate.InputBP
      if (instruction != '') {
        if (type == 'edit') {
          word = task.Name + '(' + task.Unit + ')'
          var arry = instruction.split('，')
          var blStr = arry[arry.length - 1]
          $scope.data.value1 = blStr.split('/')[0]
          $scope.data.value2 = blStr.split('/')[1]
        }
      }
      $scope.data.alertFlag1 = false
      $scope.data.alertFlag2 = false
    } else {
      if(task.code == 'PeritonealDialysis')
      {
         Template = PopTemplate.Textarea;              
      }
      if (instruction == '') {
        type = 'fill'
      }
      if (type == 'edit') {
        word = task.Name + '(' + task.Unit + ')'
        content = instruction
        var arry = content.split('，')
        content = arry[arry.length - 1]
      }
    }
    res.Template = Template
    res.word = word
    res.content = content
    res.flag = flag
    return res
  }

  $scope.CompleteUserdetail = function () {
    $state.go('userdetail', {last: 'tasklist'})
  }

  // 血透弹窗
  //输入：任务对象，类型（fill/edit)
  //输出：弹窗
  $scope.showHemoPop = function (task, type) {
    $scope.data = {}
    $scope.data.alertFlag = false
      // console.log(task);
    if (task.instruction == '') {
      type = 'fill'
    }
    if (type == 'edit') {
      var arry = task.instruction.split('，')
      $scope.data.value = arry[arry.length - 1]
      word = task.Name + '情况'
    } else {
      content = ''
      word = '请填写' + task.Name + '情况'
    }
    var myPopup = $ionicPopup.show({
      template: PopTemplate.Textarea,
      title: word,
      scope: $scope,
      buttons: [
           { text: '取消' },
        {
          text: '保存',
          type: 'button-positive',
          onTap: function (e) {
            if (!$scope.data.value) {
                 // 不允许用户关闭，除非输入内容
              e.preventDefault()
            } else {
              return $scope.data.value
            }
          }
        }
      ]
    })
    myPopup.then(function (res) {
      if (res) {
        var Description = res
        if (task.instruction == '设定血透排班') {
          task.instruction = ''
        }
        if ((type == 'fill') && (task.instruction != '')) {
          Description = task.instruction + '，' + Description
        } else {
          var arry = task.instruction.split('，')
          arry[arry.length - 1] = res
          Description = arry.join('，')
        }
        var item = {
          'userId': UserId,
          'type': task.type,
          'code': task.code,
          'date': dateNowStr,
          'status': 0,
          'description': Description
        }

          // console.log(item);
        Postcompliance(item)
      }
    })
  }

  // 其他任务弹窗
  //输入：任务对象，类型（fill/edit）
  //输出：弹窗
  $scope.showOtherPop = function (task, type) {
    if (!task.Flag) {
      type = 'fill'
    }
        // PXY 如果是复诊和化验就跳到健康详情页面,除了以往格式不对的数据的编辑
    if (task.Name == '化验' || task.Name == '复诊') {
      var date = new Date(task.instruction)
      var healthinfo = {id: null, caneidt: true}
      if (type == 'fill') {
        Storage.set('task', JSON.stringify({type: task.type, code: task.code}))
        Storage.set('otherTasks', JSON.stringify($scope.Tasks.Other))
        $state.go('tab.myHealthInfoDetail', healthinfo)
        return
      } else if (type == 'edit' && date != 'Invalid Date') {
        Storage.set('task', JSON.stringify({type: task.type, code: task.code}))
        Storage.set('otherTasks', JSON.stringify($scope.Tasks.Other))
        healthinfo.id = {insertTime: task.instruction}
        $state.go('tab.myHealthInfoDetail', healthinfo)
        return
      }
    }
    $scope.data = {}
    $scope.data.alertFlag = false
    $scope.data.value = task.instruction
    console.log($scope.data.value)
    word = task.Name + '情况'
    if (type == 'fill') {
      word = '请填写' + word
      $scope.data.value = ''
    }

    var myPopup = $ionicPopup.show({
      template: PopTemplate.Textarea,
      title: word,
      scope: $scope,
      buttons: [
             { text: '取消' },
        {
          text: '保存',
          type: 'button-positive',
          onTap: function (e) {
            if (!$scope.data.value) {
                   // 不允许用户关闭，除非输入内容
              e.preventDefault()
            } else {
              return $scope.data.value
            }
          }
        }
      ]
    })

    myPopup.then(function (res) {
      if (res) {
            // 向任务表中插入数据
        var item = {
          'userId': UserId,
          'type': task.type,
          'code': task.code,
          'date': dateNowStr,
          'status': 0,
          'description': res
        }
        Postcompliance(item)
      }
    })
  }

  // 获取某项任务执行情况
  //输入：任务对象
  //输出：字符串
  function GetTaskInfo (task) {
    var res = ''
    var promise = Compliance.getcompliance(task)
    promise.then(function (data) {
      if (data.results) {
        res = data.results.description
      }
         // console.log(data.results);
      ChangeLongFir()// 修改长周期任务第一次执行时间
    }, function () {
    })
    return res
  }

  // 测量输入格式与范围判定
  //输入：测量值，编码
  //输出：对象（包括警告语，数字，字符串）
  function AboutRange (value, code) {
    var word = ''
    var num = -1
    var res = {}
    var str = value.replace(/(^\s*)|(\s*$)/g, '')// 去除字符串两端空格
    if (isNaN(str)) {
      word = '请输入数字！'
    } else {
      var num = parseInt(str)
      var range = RangeMatch(code)
      if (!jQuery.isEmptyObject(range)) {
        if ((num < range.Min) || (num > range.Max)) {
          word = '您输入的数值不在正常范围内!'
        }
      }
    }
    res.word = word
    res.num = num
    res.str = str
    return res
  }

  // 提示框
  //输入：无
  //输出：弹框
  $scope.showAlert = function () {
    var alertPopup = $ionicPopup.alert({
      title: '提示',
      template: '请注意，您可能患有高血压！'
    })
    alertPopup.then(function (res) {
    })
  }

  // 任务完成后设定下次任务执行时间
  //输入：字符串时间，频率次数，单位，次数
  //输出：Date日期
  function SetNextTime (LastDate, FreqTimes, Unit, Times) {
    var NextTime
    if ((Unit == '年') && (Times == 2))// 一年2次
        {
      Unit = '月'
      FreqTimes = 6
    }
    var tbl = {'周': 7, '月': 30, '年': 365}
    var someDays = tbl[Unit] * FreqTimes
    var days = GetDifDays(LastDate, dateNowStr)
    if (days > someDays) {
      NextTime = new Date(LastDate)
    } else {
      var add = FreqTimes
      if (Unit == '周') {
        add = FreqTimes * 7
      }
      NextTime = DateCalc(LastDate, Unit, add)
    }
        // console.log(NextTime);
    return NextTime
  }

  // 点击按钮开始新任务
  //输入：任务对象
  //输出：无
  $scope.StartNewTask = function (task) {
    task.Flag = false
  }

  // 日期延后计算
  //输入：字符串日期，类型（周/月/年)，相加量（整数）
  //输出：Date日期
  function DateCalc (LastDate, Type, Addition) {
    var Date1 = new Date(LastDate)
    var Date2
    if (Type == '周') // 周
      {
      Date2 = new Date(Date1.setDate(Date1.getDate() + Addition))
    } else if (Type == '月') {
      Date2 = new Date(Date1.setMonth(Date1.getMonth() + Addition))
    } else // 年
      {
      Date2 = new Date(Date1.setYear(Date1.getFullYear() + Addition))
    }
    return Date2
  }

  // 医生排班表数据
  $scope.Docweek = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  $scope.TblColor1 = ['gray', 'green', 'gray', 'gray', 'green', 'green', 'gray']
  $scope.TblColor2 = ['gray', 'green', 'green', 'green', 'gray', 'gray', 'gray']

  // 弹窗：医生排班表
  //输入：无
  //输出：弹窗
  $ionicModal.fromTemplateUrl('templates/modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    $scope.modal = modal
  })
  $scope.openModal = function () {
    GetMyDoctors()
    $scope.modal.show()
  }
  $scope.closeModal = function () {
    $scope.modal.hide()
  }
     // 清除
  $scope.$on('$destroy', function () {
    $scope.modal.remove()
  })

  // 修改日期格式Date → yyyy-mm-dd
  //输入：Date日期
  //输出：字符串日期
  function ChangeTimeForm (date) {
    var nowDay = ''
    if (date instanceof Date) {
      var mon = date.getMonth() + 1
      var day = date.getDate()
      nowDay = date.getFullYear() + '-' + (mon < 10 ? '0' + mon : mon) + '-' + (day < 10 ? '0' + day : day)
    }
    return nowDay
  }

  // 页面刷新
  //输入：无
  //输出：无
  $scope.Refresh = function () {
    $window.location.reload()
  }

  // 跳转至任务设置页面
  //输入：无
  //输出：页面跳转
  $scope.GotoSet = function () {
    $state.go('tab.taskSet')
  }

  // 血透排班表字典
  $scope.HemoTbl = [
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'},
                     {'background-color': 'white'}
  ]

  // 获取医生排班
  //输入：无
  //输出：无
  function GetMyDoctors () {
    var promise = Patient.getMyDoctors({userId: UserId})
    promise.then(function (data) {
      if (data.results.doctorId) {
        console.log(data)
        var schedules = data.results.doctorId.schedules
            // console.log(schedules);
        if (schedules) {
          for (var i = 0; i < schedules.length; i++) {
            var num = parseInt(schedules[i].day)
            if (schedules[i].time == '1') {
              num = num + 7
            }
                   // console.log(num);
            $scope.HemoTbl[num]['background-color'] = 'red'
          }
        }
      }
      if (data.results.doctorId.suspendTime.length == 0) {
        $scope.hasstop = false
      } else {
        $scope.dateC = new Date()
        var date = new Date()
        var dateNow = '' + date.getFullYear();
        (date.getMonth() + 1) < 10 ? dateNow += '0' + (date.getMonth() + 1) : dateNow += (date.getMonth() + 1)
        date.getDate() < 10 ? dateNow += '0' + date.getDate() : dateNow += date.getDate()
        console.log(dateNow)

        $scope.begin = data.results.doctorId.suspendTime[0].start
        $scope.end = data.results.doctorId.suspendTime[0].end

        date = new Date($scope.begin)
        var dateB = '' + date.getFullYear();
        (date.getMonth() + 1) < 10 ? dateB += '0' + (date.getMonth() + 1) : dateB += (date.getMonth() + 1)
        date.getDate() < 10 ? dateB += '0' + date.getDate() : dateB += date.getDate()
        date = new Date($scope.end)
        var dateE = '' + date.getFullYear();
        (date.getMonth() + 1) < 10 ? dateE += '0' + (date.getMonth() + 1) : dateE += (date.getMonth() + 1)
        date.getDate() < 10 ? dateE += '0' + date.getDate() : dateE += date.getDate()

        if (dateNow >= dateB && dateNow <= dateE) {
          $scope.hasstop = true
        } else {
          $scope.hasstop = false
        }
      }
    }, function () {

    })
  }
}])

// 任务设置--GL
.controller('TaskSetCtrl', ['$scope', '$state', '$ionicHistory', 'Storage', 'Patient', 'Task', '$ionicPopup', '$ionicLoading', function ($scope, $state, $ionicHistory, Storage, Patient, Task, $ionicPopup, $ionicLoading) {
  // 初始化
  var UserId = Storage.get('UID')
    // UserId = "Test13";
  $scope.Tasks = {}
  $scope.OKBtnFlag = true
  $scope.EditFlag = false
  var dateNowStr = ChangeTimeForm(new Date()) // 方便设定当前日期进行调试，或是之后从数据库获取当前日期
  $scope.$on('$ionicView.enter', function () {
    $scope.noTasks = false
    GetTasks()
  })

  // 获取对应任务模板
  //输入：无
  //输出：无
  function GetTasks () {
    var promise = Task.getUserTask({userId: UserId})
    promise.then(function (data) {
      console.log(data)
      if (data.result) {
        $scope.noTasks = true
        $scope.Tasks = data.result.task
        //console.log($scope.Tasks)
        HandleTasks()
      } else {
        $ionicLoading.show({template: '请您先在个人信息中完善用户信息', duration: 1000})
      }
    })
  }

  // 获取模板后进行处理
  //输入：无
  //输出：无
  function HandleTasks () {
    $scope.Tasks.Other = []
    $scope.Tasks.Hemo = [] // 血透排班
    $scope.Tasks.Hemo.Flag = false
    for (var i = 0; i < $scope.Tasks.length; i++) {
      var task = $scope.Tasks[i]
      var newTask = []
         // console.log(task);
      if (task.type == 'Measure') {
        $scope.Tasks.Measure = task.details

        for (var j = 0; j < $scope.Tasks.Measure.length; j++) {
          var temp = $scope.Tasks.Measure[j]
          if (temp.frequencyUnits == '天')// 限定每日完成的任务
                {
            $scope.Tasks.Measure[j].Name = NameMatch($scope.Tasks.Measure[j].code)
            $scope.Tasks.Measure[j].Freq = temp.frequencyTimes + temp.frequencyUnits + temp.times + temp.timesUnits
          } else {
            if (temp.code == 'VascularAccess') {
              newTask = $scope.Tasks.Measure[j]
              newTask.type = task.type
              newTask.Name = '血管通路情况'
              newTask.Freq = newTask.frequencyTimes + newTask.frequencyUnits + newTask.times + newTask.timesUnits
              newTask = TimeSelectBind(newTask)
              $scope.Tasks.Other.push(newTask)
              $scope.Tasks.Measure.splice(j, 1)
            }
          }
        }
      } else {
        for (var j = 0; j < task.details.length; j++) {
          newTask = task.details[j]
          if ((task.type == 'ReturnVisit') && (newTask.code == 'stage_9')) // 排除血透排班
                {
            $scope.Tasks.Hemo = newTask
            $scope.Tasks.Hemo.type = task.type
            $scope.Tasks.Hemo.Flag = true
            $scope.Tasks.Hemo.Freq = newTask.frequencyTimes + newTask.frequencyUnits + newTask.times + newTask.timesUnits
                    // console.log($scope.Tasks.Hemo);
            if ((newTask.content != '') && (newTask.content != ' ')) // 修改表格样式
                    {
              var NumArry = newTask.content.split('+')[1].split(',')
              for (var k = 0; k < NumArry.length; k++) {
                $scope.HemoTbl[NumArry[k]].style['background-color'] = 'red'
              }
            }
          } else if (newTask.times == 0) // 排除只执行一次的任务
                {
                    // 暂时不放进来
          } else {
            newTask.type = task.type
            newTask.Name = NameMatch(newTask.type)
            newTask.Freq = newTask.frequencyTimes + newTask.frequencyUnits + newTask.times + newTask.timesUnits
            newTask = TimeSelectBind(newTask)
            $scope.Tasks.Other.push(newTask)
          }
        }
      }
    }
      // console.log($scope.Tasks);
  }

  // 名称转换
  //输入：编码
  //输出：中文名称
  function NameMatch (name) {
    var Tbl = [
                 {Name: '体温', Code: 'Temperature'},
                 {Name: '体重', Code: 'Weight'},
                 {Name: '血压', Code: 'BloodPressure'},
                 {Name: '尿量', Code: 'Vol'},
                 {Name: '心率', Code: 'HeartRate'},
                 {Name: '复诊', Code: 'ReturnVisit'},
                 {Name: '化验', Code: 'LabTest'},
                 {Name: '特殊评估', Code: 'SpecialEvaluate'},
                 {Name: '血管通路情况', Code: 'VascularAccess'},
                 {Name: '腹透', Code: 'PeritonealDialysis'},
                 {Name: '超滤量', Code: 'cll'},
                 {Name: '浮肿', Code: 'ywfz'},
                 {Name: '引流通畅', Code: 'yl'}
    ]
    for (var i = 0; i < Tbl.length; i++) {
      if (Tbl[i].Code == name) {
        name = Tbl[i].Name
        break
      }
    }
    return name
  }

  // 时间下拉框绑定
  //输入：任务对象
  //输出：修改后的任务对象
  function TimeSelectBind (item) {
    var flag = false
    var day
    if (item.startTime != '2050-11-02T07:58:51.718Z') // 已设置过时间，选定的日期应从取得的数据计算
        {
      var date = new Date(item.startTime)
      flag = true
    }
    var Unit = item.frequencyUnits
    if (Unit == '周') {
      item.Days = $scope.Week
      item.Type = 'week'
      if (flag) {
        var day = date.getDay()
        item.SelectedDay = $scope.Week[day]
      } else {
        item.SelectedDay = '星期一' // 默认时间
      }
    } else if (Unit == '月') {
      item.Days = $scope.Days
      item.Type = 'month'
      if (flag) {
        var day = date.getDate()
        item.SelectedDay = $scope.Days[day - 1]
      } else {
        item.SelectedDay = '1日' // 默认时间
      }
    } else if (Unit == '年') {
      item.Days = $scope.Month
      item.Type = 'year'
      if (flag) {
        var day = date.getMonth()
        item.SelectedDay = $scope.Month[day]
      } else {
        item.SelectedDay = '1月' // 默认时间
      }
    }
    return item
  }

  // 时间下拉框数据
  $scope.Week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  $scope.Days = ['1日', '2日', '3日', '4日', '5日', '6日', '7日', '8日', '9日', '10日', '11日', '12日', '13日', '14日', '15日', '16日', '17日', '18日', '19日', '20日', '21日', '22日', '23日', '24日', '25日', '26日', '27日', '28日']
  $scope.Month = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  // 任务时间插入数据库
  //输入：无
  //输出：无
  $scope.SetDate = function () {
    if ($scope.Tasks.Hemo.Flag) {
      SetHemoDate($scope.Tasks.Hemo)
    }
    for (var i = 0; i < $scope.Tasks.Other.length; i++) {
      var task = $scope.Tasks.Other[i]
      $scope.Tasks.Other.startTime = SetTaskTime(task.SelectedDay, task.frequencyUnits)
      item = {
        'userId': UserId,
        'type': task.type,
        'code': task.code,
        'instruction': task.instruction,
        'content': task.content,
        'startTime': $scope.Tasks.Other.startTime,
        'endTime': task.endTime,
        'times': task.times,
        'timesUnits': task.timesUnits,
        'frequencyTimes': task.frequencyTimes,
        'frequencyUnits': task.frequencyUnits
      }
      UpdateUserTask(item)  // 更改任务下次执行时间
    }
    if ($scope.OKBtnFlag) {
      $ionicHistory.goBack()
        // $state.go('tab.tasklist');
    }
  }
  
  //页面返回
  //输入：无
  //输出：无
  $scope.Goback = function () {
    //console.log('goBack')
    //console.log($ionicHistory.backView())
    $ionicHistory.goBack()
  }

  // 更新用户任务模板
  //输入：任务对象
  //输出：无
  function UpdateUserTask (task) {
    var promise = Task.updateUserTask(task)
    promise.then(function (data) {
         // console.log(data);
      if (data.results) {
        //console.log(data.results)
      };
    }, function () {
    })
  }

  // 选定星期或号数后，默认为离当前日期最近的日期
  //输入：下拉框选定的时间，时间类型（周、月、年）
  //输出：任务时间（格式：xxxx-xx-xx）
  function SetTaskTime (SelectedDay, Type) {
      // 暂时就用本地时间
    var CurrentDate = new Date(dateNowStr)
    var NewDate
    var WeekDay = CurrentDate.getDay() // 0-6 0为星期日
    var Day = CurrentDate.getDate() // 1-31
    var Month = CurrentDate.getMonth() // 0-11,0为1月

    var Num = 0
    if (Type == '周') {
      Num = $scope.Week.indexOf(SelectedDay)

      if (Num >= WeekDay) // 所选日期未过，选择本星期
         {
        NewDate = new Date(CurrentDate.setDate(Day + Num - WeekDay))
      } else // 下个星期
         {
        NewDate = new Date(CurrentDate.setDate(Day + Num + 7 - WeekDay))
      }
    } else if (Type == '月') {
      Num = $scope.Days.indexOf(SelectedDay) + 1
      NewDate = new Date(CurrentDate.setDate(Num))
      if (Num < Day) // 所选日期已过，选择下月
         {
        NewDate = new Date(CurrentDate.setMonth(CurrentDate.getMonth() + 1))
      }
    } else if (Type == '年') {
      Num = $scope.Month.indexOf(SelectedDay)
      NewDate = new Date(CurrentDate.setMonth(Num))
      if (Num < Month)// 所选日期已过，选择明年
         {
        NewDate = new Date(CurrentDate.setYear(CurrentDate.getFullYear() + 1))
      }
    }
      // console.log(NewDate);
    return ChangeTimeForm(NewDate)
  }

  // 按下按钮后使页面可编辑
  //输入：无
  //输出：无
  $scope.EnableEdit = function () {
    $('select').attr('disabled', false)
    $scope.EditFlag = true
  }

  // 修改日期格式Date → yyyy-mm-dd
  //输入：Date格式的日期
  //输出：字符串格式的日期（yyyy-mm-dd）
  function ChangeTimeForm (date) {
    var nowDay = ''
    if (date instanceof Date) // 判断是否为日期格式
      {
      var mon = date.getMonth() + 1
      var day = date.getDate()
      nowDay = date.getFullYear() + '-' + (mon < 10 ? '0' + mon : mon) + '-' + (day < 10 ? '0' + day : day)
    }
    return nowDay
  }

  // 血透排班表字典
  $scope.HemoTbl = [
                     {No: 0, style: {'background-color': 'white'}, Day: '星期一'},
                     {No: 1, style: {'background-color': 'white'}, Day: '星期二'},
                     {No: 2, style: {'background-color': 'white'}, Day: '星期三'},
                     {No: 3, style: {'background-color': 'white'}, Day: '星期四'},
                     {No: 4, style: {'background-color': 'white'}, Day: '星期五'},
                     {No: 5, style: {'background-color': 'white'}, Day: '星期六'},
                     {No: 6, style: {'background-color': 'white'}, Day: '星期日'},
                     {No: 7, style: {'background-color': 'white'}, Day: '星期一'},
                     {No: 8, style: {'background-color': 'white'}, Day: '星期二'},
                     {No: 9, style: {'background-color': 'white'}, Day: '星期三'},
                     {No: 10, style: {'background-color': 'white'}, Day: '星期四'},
                     {No: 11, style: {'background-color': 'white'}, Day: '星期五'},
                     {No: 12, style: {'background-color': 'white'}, Day: '星期六'},
                     {No: 13, style: {'background-color': 'white'}, Day: '星期日'}
  ]

  // 点击进行血透排班选择（颜色改变或弹出警告）
  //输入：选定的数字编号
  //输出：无
  $scope.HemoSelect = function (num) {
    if ($scope.EditFlag) {
      var num1
      if ($scope.HemoTbl[num].style['background-color'] == 'white') {
               // 判断是否选中同一天
        if (num >= 7) {
          num1 = num - 7
        } else {
          num1 = num + 7
        }
        if ($scope.HemoTbl[num1].style['background-color'] == 'red') {
          $scope.showAlert('请不要在同一天安排两次血透！')
        } else {
          $scope.HemoTbl[num].style['background-color'] = 'red'
        }
      } else {
        $scope.HemoTbl[num].style['background-color'] = 'white'
      }
    }
  }

  // 血透排班写入数据库
  //输入：任务对象
  //输出：无
  function SetHemoDate (task) {
    var times = task.times
    var dateStr = ''
    var numStr = ''
    var res = ''
    var count = 0
    for (var i = 0; i < $scope.HemoTbl.length; i++) {
      if ($scope.HemoTbl[i].style['background-color'] == 'red') {
        count++
        numStr = numStr + ',' + i.toString()
        dateStr = dateStr + ',' + SetTaskTime($scope.HemoTbl[i].Day, '周')
      }
    }

    if (count < times) {
      $scope.showAlert('血透排班次数不足')
      $scope.OKBtnFlag = false
    } else if (count > times) {
      $scope.showAlert('血透排班次数过多')
      $scope.OKBtnFlag = false
    } else {
      numStr = numStr.substr(1)
      dateStr = dateStr.substr(1)
      $scope.OKBtnFlag = true
      res = dateStr + '+' + numStr
      var item = {
        'userId': UserId,
        'type': task.type,
        'code': task.code,
        'instruction': task.instruction,
        'content': res,
        'startTime': task.startTime,
        'endTime': task.endTime,
        'times': task.times,
        'timesUnits': task.timesUnits,
        'frequencyTimes': task.frequencyTimes,
        'frequencyUnits': task.frequencyUnits
      }
      UpdateUserTask(item)  // 更改任务下次执行时间
    }
  }

  // 血透次数选择
  $scope.HemoTimesOptions = [2, 3]
   /* $scope.SetHemoTimes = function(times)
   {
      $scope.Tasks.Hemo.times = times;
      console.log($scope.Tasks.Hemo.times);
   } */

  // 提示对话框
  //输入：提示语（字符串）
  //输出：提示弹框
  $scope.showAlert = function (words) {
    var alertPopup = $ionicPopup.alert({
      title: '提示',
      template: words
    })
    alertPopup.then(function (res) {
    })
  }
}])

// 我的 页面--PXY
.controller('MineCtrl', ['$interval', 'News', '$scope', '$ionicHistory', '$state', '$ionicPopup', '$resource', 'Storage', 'CONFIG', '$ionicLoading', '$ionicPopover', 'Camera', 'Patient', 'Upload', '$sce', 'mySocket', 'socket', function ($interval, News, $scope, $ionicHistory, $state, $ionicPopup, $resource, Storage, CONFIG, $ionicLoading, $ionicPopover, Camera, Patient, Upload, $sce, mySocket, socket) {
  var patientId = Storage.get('UID')
  /**

   * [参照DoctorCtrl中同名函数，获取是否有未读消息]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  var GetUnread = function () {
      // console.log(new Date());
    News.getNewsByReadOrNot({userId: Storage.get('UID'), readOrNot: 0, userRole: 'patient'}).then(//
          function (data) {
              // console.log(data);
            if (data.results.length) {
              $scope.HasUnreadMessages = true
                  // console.log($scope.HasUnreadMessages);
            } else {
              $scope.HasUnreadMessages = false
            }
          }, function (err) {
      console.log(err)
    })
  }
  /**

   * [消息轮询启动]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.$on('$ionicView.enter', function () {
    RefreshUnread = $interval(GetUnread, 2000)
  })
  /**
   * [消息轮询取消]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.$on('$ionicView.leave', function () {
    console.log('destroy')
    $interval.cancel(RefreshUnread)
  })
  // 页面跳转---------------------------------
  // 点击个人信息，页面跳转并传递参数
  // last表明是从“我的”入口进入个人信息
  $scope.GoUserDetail = function () {
    $state.go('userdetail', {last: 'mine'})
  }
  // 点击诊断记录，页面跳转
  $scope.GoDiagnosiInfo = function () {
    $state.go('tab.DiagnosisInfo')
  }
  // 点击咨询记录，页面跳转
  $scope.GoConsultRecord = function () {
    $state.go('tab.myConsultRecord')
  }
  // 点击健康信息，页面跳转
  $scope.GoHealthInfo = function () {
    $state.go('tab.myHealthInfo')
  }
  // 点击肾病管理方案，页面跳转
  $scope.GoManagement = function () {
    $state.go('tab.taskSet')
  }
  // 点击我的设备，页面跳转
  $scope.GoDevices = function () {
    // console.log('tab.devices')
    $state.go('tab.devices')
  }
  // 点击增值服务，页面跳转
  $scope.GoMoney = function () {
    $state.go('tab.myMoney')
  }
  /**
   * [点击退出账号，论坛退出登录，弹窗提示，确认后socket断开，清除除了用户名之外的缓存]  注：好像不用调用logout数据库方法
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.SignOut = function () {
    //论坛退出登录
    $scope.navigation_login = $sce.trustAsResourceUrl('http://patientdiscuss.haihonghospitalmanagement.com/member.php?mod=logging&action=logout&formhash=xxxxxx')
    var myPopup = $ionicPopup.show({
      template: '<center>确定要退出登录吗?</center>',
      title: '退出',
            // subTitle: '2',
      scope: $scope,
      buttons: [
        { text: '取消',
          type: 'button-small',
          onTap: function (e) {
          }
        },
        {
          text: '确定',
          type: 'button-small button-positive ',
          onTap: function (e) {
            $state.go('signin')
            Storage.rm('TOKEN')
            var USERNAME = Storage.get('USERNAME')
            Storage.clear()
                    // Storage.rm('patientunionid');
                    // Storage.rm('PASSWORD');
            Storage.set('isSignIN', 'No')
            $scope.$emit('isSignIN', 'No')
            Storage.set('USERNAME', USERNAME)
            mySocket.cancelAll()
            socket.emit('disconnect')
            socket.disconnect()
                     // $timeout(function () {
            $ionicHistory.clearCache()
            $ionicHistory.clearHistory()

                    // }, 30);
                    // $ionicPopup.hide();
          }
        }
      ]
    })
  }
  // 点击意见反馈，页面跳转
  $scope.ReflectAdvice = function () {
    $state.go('tab.advice')
  }
  // 点击关于，页面跳转
  $scope.About = function () {
    $state.go('tab.about')
  }
  // 点击修改密码，页面跳转
  $scope.ChangePassword = function () {
    $state.go('tab.changePassword')
  }
    // $scope.myAvatar = ""
    // 根据用户ID查询用户头像
  /**
   * 用户默认头像地址
   * [myAvatar description]
   * @type {String}
   */
  $scope.myAvatar = 'img/DefaultAvatar.jpg'
  /**

   * [获取患者个人信息，显示头像]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    {userId：String}
   * @return   res:{results:{photoUrl:String,..}}
   */
  Patient.getPatientDetail({userId: Storage.get('UID')}).then(function (res) {
    if (res.results) {
            // console.log(res.results);
      if (res.results.photoUrl && res.results.photoUrl != 'http://pp.jpg') {
        $scope.myAvatar = res.results.photoUrl
      }
    }
  })

  // 上传头像的点击事件----------------------------
  $scope.onClickCamera = function ($event) {
    $scope.openPopover($event)
  }
  $scope.reload = function () {
    var t = $scope.myAvatar
    $scope.myAvatar = ''

    $scope.$apply(function () {
      $scope.myAvatar = t
    })
  }

 // 上传照片并将照片读入页面-------------------------
  var photo_upload_display = function (imgURI) {
   // 给照片的名字加上时间戳
    var temp_photoaddress = Storage.get('UID') + '_' + 'myAvatar.jpg'
    console.log(temp_photoaddress)
    Camera.uploadPicture(imgURI, temp_photoaddress)
    .then(function (res) {
      var data = angular.fromJson(res)
      // res.path_resized
      // 图片路径
      $scope.myAvatar = CONFIG.mediaUrl + String(data.path_resized) + '?' + new Date().getTime()
      console.log($scope.myAvatar)
      // $state.reload("tab.mine")
      // Storage.set('myAvatarpath',$scope.myAvatar);
      /**
       * *上传用户头像信息
       * @Author   ZXF
       * @DateTime 2017-07-14
       * @param    {[type]}   r) {                   console.log(r)      } [description]
       * @return   {[type]}      [description]
       */
      Patient.editPatientDetail({userId: Storage.get('UID'), photoUrl: $scope.myAvatar}).then(function (r) {
        console.log(r)
      })
    }, function (err) {
      console.log(err)
      reject(err)
    })
  }
  /**
   * *点击上传头像 弹框
   * @Author   ZXF
   * @DateTime 2017-07-14
   * @param    {[type]}   popover) {               $scope.popover [description]
   * @return   {[type]}            [description]
   */
  $ionicPopover.fromTemplateUrl('partials/pop/cameraPopover.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (popover) {
    $scope.popover = popover
  })
  $scope.openPopover = function ($event) {
    $scope.popover.show($event)
  }
  $scope.closePopover = function () {
    $scope.popover.hide()
  }
  // Cleanup the popover when we're done with it!
  $scope.$on('$destroy', function () {
    $scope.popover.remove()
  })
  // Execute action on hide popover
  $scope.$on('popover.hidden', function () {
    // Execute action
  })
  // Execute action on remove popover
  $scope.$on('popover.removed', function () {
    // Execute action
  })

  // 相册键的点击事件---------------------------------
  $scope.onClickCameraPhotos = function () {
   // console.log("选个照片");
    $scope.choosePhotos()
    $scope.closePopover()
  }
  //从相册选取相片
  $scope.choosePhotos = function () {
    Camera.getPictureFromPhotos('gallery').then(function (data) {
        // data里存的是图像的地址
        // console.log(data);
      var imgURI = data
      photo_upload_display(imgURI)
    }, function (err) {
        // console.err(err);
      var imgURI
    })// 从相册获取照片结束
  } // function结束

  // 照相机的点击事件----------------------------------
  $scope.getPhoto = function () {
      // console.log("要拍照了！");
    $scope.takePicture()
    $scope.closePopover()
  }
  $scope.isShow = true
  $scope.takePicture = function () {
    Camera.getPicture('cam').then(function (data) {
      console.log(data)
      photo_upload_display(data)
    }, function (err) {
          // console.err(err);
      var imgURI
    })// 照相结束
  } // function结束
}])

// 诊断信息
.controller('DiagnosisCtrl', ['Dict', '$scope',
  '$state', 'Storage', '$ionicLoading', 'Patient', function (Dict, $scope, $state, Storage, $ionicLoading, Patient) {
    $scope.Goback = function () {
      $state.go('tab.mine')
    }

  // 过滤重复的医生诊断 顺序从后往前，保证最新的一次诊断不会被过滤掉
  /**
   * [过滤重复的医生诊断]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    arr:[ {
                "name": "class_4",
                "time": "2017-05-14T16:00:00.000Z",
                "hypertension": 1,
                "progress": "stage_5",
                "operationTime": "2017-05-12T16:00:00.000Z",
                "content": "肾小球肾炎",
                "doctor": {
                    "name": "徐楠",
                    "workUnit": "杏康门诊部",
                    "department": "肾内科",
                    "userId": "U201612260027"
                }
                },...,{}]
   * @return   result:[{},...,{}] 注：跟输入结构一致，只是过滤了同一医生的诊断
   */
    var FilterDiagnosis = function (arr) {
      var result = []
      var hash = {}
      for (var i = arr.length - 1; i >= 0; i--) {
        var elem = arr[i].doctor.userId
        if (!hash[elem]) {
          result.push(arr[i])
          hash[elem] = true
        }
      }
      return result
    }
  /**
   * [获取患者诊断记录，绑定数据]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
    var RefreshDiagnosisInfo = function () {
      $scope.noDiags = false
    /**
     * [获取患者诊断记录]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId:String}
     * @return   data:{results:{diagnosisiInfo:[{},...,{}],...}}  注：data.results也可能为String类型（没填个人信息时）
     */
      Patient.getPatientDetail({userId: Storage.get('UID')}).then(// userId:Storage.get('UID')
        function (data) {
          // console.log(data.results)
          if (data.results && data.results != '没有填写个人信息') {
            if (data.results.diagnosisInfo.length) {
              var allDiags = data.results.diagnosisInfo
              // console.log(allDiags)
              var DoctorDiags = FilterDiagnosis(allDiags)
                // console.log(DoctorDiags);
              /**
               * [从数据库获取疾病类型字典表，并根据诊断中的疾病类型决定显示疾病进程还是手术时间以及时间控件的名称]
               * @Author   PXY
               * @DateTime 2017-07-11
               * @param    {category: String}
               * @return   data:{results:{content:[{details:[{},...,{}],type:String,typeName:String},...,{}]}}
               */
              Dict.getDiseaseType({category: 'patient_class'}).then(
                    function (data) {
                      $scope.Diseases = data.results[0].content
                      $scope.Diseases.push($scope.Diseases[0])
                      $scope.Diseases.shift()
                      // console.log($scope.Diseases)
                      for (var i = 0; i < DoctorDiags.length; i++) {
                        if (DoctorDiags[i].name != null) {
                            // console.log(i);
                            // console.log(DoctorDiags[i].name);
                            // DoctorDiags[i].name = searchObj(DoctorDiags[i].name,$scope.Diseases);
                            // DoctorDiags[i].hypertension = searchObj(DoctorDiags[i].hypertension,$scope.Hypers);
                          if (DoctorDiags[i].name == 'class_5') {
                            DoctorDiags[i].showProgress = false
                            DoctorDiags[i].showSurgicalTime = true
                            DoctorDiags[i].timename = '插管日期'
                          } else if (DoctorDiags[i].name == 'class_1') {
                            DoctorDiags[i].showProgress = false
                            DoctorDiags[i].showSurgicalTime = true
                            DoctorDiags[i].timename = '手术日期'
                          } else if (DoctorDiags[i].name == 'class_6') {
                            DoctorDiags[i].showProgress = false
                            DoctorDiags[i].showSurgicalTime = true
                            DoctorDiags[i].timename = '开始日期'
                          } else if (DoctorDiags[i].name == 'class_4') {
                            DoctorDiags[i].showProgress = false
                            DoctorDiags[i].showSurgicalTime = false
                          } else {
                            DoctorDiags[i].showProgress = true
                            DoctorDiags[i].showSurgicalTime = false
                            DoctorDiags[i].DiseaseDetails = DoctorDiags[i].name.details
                            // console.log(DoctorDiags[i].DiseaseDetails)
                              // if(DoctorDiags[i].DiseaseDetails!=undefined){
                              //   DoctorDiags[i].progress = searchObj(DoctorDiags[i].progress,DoctorDiags[i].DiseaseDetails);
                              // }
                          }
                        }
                      }
                      $scope.Diags = DoctorDiags

                      // console.log($scope.Diseases)
                    },
                    function (err) {
                      console.log(err)
                    }
                  )
            } else {
              $scope.noDiags = true
            }
          } else {
            $ionicLoading.show({template: '请您先在个人信息中完善用户信息', duration: 1000})
          }
        }, function (err) {
        console.log(err)
      })
    }
  /**
   * [进入视图后调用方法RefreshDiagnosisInfo]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
    $scope.$on('$ionicView.enter', function () {
      RefreshDiagnosisInfo()
    })
  /**
   * [下拉刷新重新调用方法RefreshDiagnosisInfo]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
    $scope.do_refresher = function () {
      RefreshDiagnosisInfo()
      $scope.$broadcast('scroll.refreshComplete')
    }
  }])
// 咨询记录--PXY
.controller('ConsultRecordCtrl', ['News', 'Patient', 'Storage', '$scope', '$state', '$ionicHistory', '$ionicLoading', 'Counsels', '$ionicPopup', function (News, Patient, Storage, $scope, $state, $ionicHistory, $ionicLoading, Counsels, $ionicPopup) {
  // 返回按钮
  $scope.Goback = function () {
    $state.go('tab.mine')
  }

  $scope.noConsult = false

  // 过滤重复的医生 顺序从后往前，保证最新的一次咨询不会被过滤掉
  /**
   * [过滤重复的医生咨询记录]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    arr:[ {
                      "doctorId": {
                          "userId": "U201705120008",
                          "name": "马志彬",
                          "photoUrl": "http://121.196.221.44:8052/uploads/photos/resizedU201705120008_myAvatar.jpg?1494654670367"
                      },
                      "time": "2017-05-13T07:14:10.651Z",
                      "messages": []
                    },
                    ...,
                    {}
                    ]
   * @return   result:[{},...,{}] 注：跟输入结构一致，只是过滤了同一医生的咨询记录
   */
  var FilterDoctor = function (arr) {
    var result = []
    var hash = {}
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].doctorId) {
        var elem = arr[i].doctorId.userId
        if (!hash[elem]) {
          result.push(arr[i].doctorId)
          hash[elem] = true
        }
      }
    }
    return result
  }
  /**

   * [获取咨询记录和最新消息，两个数组关联起来，绑定页面数据]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  var RefreshCounSelRecords = function () {
    var MyId = Storage.get('UID')
    /**
     * [获取患者咨询记录]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId:String}
     * @return   data：[ {
                      "doctorId": {
                          "userId": "U201705120008",
                          "name": "马志彬",
                          "photoUrl": "http://121.196.221.44:8052/uploads/photos/resizedU201705120008_myAvatar.jpg?1494654670367"
                      },
                      "time": "2017-05-13T07:14:10.651Z",
                      "messages": []
                    },
                    ...,
                    {}
                    ]
     */
    Patient.getCounselRecords({userId: MyId}).then(function (data) {
      console.log(data)
      if (data.results.length) {
        FilteredDoctors = FilterDoctor(data.results)
        /**
         * [获取患者和医生沟通的最新消息]
         * @Author   PXY
         * @DateTime 2017-07-11
         * @param    {userId:String,type:Number}   注：type为11是医患沟通消息，建议写在constant里
         * @return   data:{results:[{
                                      "_id": "59186ef4cad54e3990442fdd",
                                      "userId": "U201705120006",
                                      "sendBy": "U201612260027",
                                      "readOrNot": 1,
                                      "type": 11,
                                      "messageId": "CMU20170515000105",
                                      "time": "2017-06-05T13:28:13.887Z",
                                      "title": "{\"U201612260027\":\"潘晓妍\",\"U201705120006\":\"徐楠\"}",
                                      "description": "[咨询结束]",
                                      "url": "{\"contentType\":\"custom\",\"fromID\":\"U201612260027\",\"fromName\":\"徐楠\",\"fromUser\":{\"avatarPath\":\"http://121.196.221.44:8052/uploads/photos/resizedU201612260027_myAvatar.jpg\"},\"targetID\":\"U201705120006\",\"targetName\":\"潘晓妍\",\"targetType\":\"single\",\"status\":\"send_success\",\"createTimeInMillis\":1494832929240,\"newsType\":\"11\",\"content\":{\"type\":\"endl\",\"info\":\"咨询已结束\",\"docId\":\"U201612260027\",\"counseltype\":1,\"src\":\"\"}}",
                                      "__v": 0
                                    },
                                    ...,
                                    {}
                                  ]}
         */
        News.getNews({userId: MyId, type: 11}).then(function (data) {
                      // console.log(data.results)
          if (data.results) {
                        // 两个for循环关联数据，只有当消息未读且不是患者发出的才显示消息红点
            for (x in FilteredDoctors) {
              for (y in data.results) {
                if (FilteredDoctors[x].userId == data.results[y].sendBy || FilteredDoctors[x].userId == data.results[y].userId) {
                  FilteredDoctors[x].lastMsgDate = data.results[y].time
                  FilteredDoctors[x].latestMsg = data.results[y].description
                  try {
                    data.results[y].url = JSON.parse(data.results[y].url)

                    FilteredDoctors[x].readOrNot = data.results[y].readOrNot || (MyId === data.results[y].url.fromID ? 1 : 0)
                                // console.log(FilteredDoctors[x].readOrNot)
                                // console.log(data.results[y].url)
                  } catch (e) {
                                            // console.log('error');
                                            // console.log(data.results[y].url);
                    FilteredDoctors[x].readOrNot = 1
                  }
                }
              }
            }
          }
          $scope.items = FilteredDoctors
          // console.log(FilteredDoctors)
        }, function (err) {
          console.log(err)
        })
      } else {
        $scope.noConsult = true
      }
    }, function (err) {
      console.log(err)
    })
  }
  // 进入视图后调用方法RefreshCounSelRecords
  $scope.$on('$ionicView.enter', function () {
    RefreshCounSelRecords()
  })
  // 下拉刷新重新调用方法RefreshCounSelRecords
  $scope.do_refresher = function () {
    RefreshCounSelRecords()
    $scope.$broadcast('scroll.refreshComplete')
  }
  /**
   * [点击咨询记录，如果点击医生头像则进入医生详情，否则进入咨询详情(参照doctorCtrl里咨询)]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    ele：Object      [MouseEvent,target为点击事件的对象]
   * @param    doctorId：String
   */
  $scope.getConsultRecordDetail = function (ele, doctorId) {
    var template = ''
    var counseltype = 0
    var counselstatus = ''
    if (ele.target.nodeName == 'IMG') {
      $state.go('tab.DoctorDetail', {DoctorId: doctorId})
    } else {
        // zz最新方法根据docid pid 不填写type获取最新一条咨询信息
        
        /**获取用户和当前医生的咨询状态
         * [doctorId description]
         * @type {[type]}
         */
      Counsels.getStatus({doctorId: doctorId, patientId: Storage.get('UID')})
        .then(function (data) {
          // console.log(data.result)
          // console.log(data.result.type)
          // console.log(data.result.status)
          if (data.result.type == 1) {
            if (data.result.status == 1) { // 有尚未完成的咨询 直接进入
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您有尚未结束的咨询，点击确认可以查看历史消息，在医生完成三次问答之前，您还可以对您的问题作进一步的描述。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  // counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: 1, status: 1}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            } else {
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您的咨询已结束，点击确认可以查看历史消息，但是无法继续发送消息。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  // counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: 1, status: 0}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            }
          } else if (data.result.type == 2 || data.result.type == 3) {
            if (data.result.status == 1) { // 尚未结束的问诊
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的问诊，点击确认可以查看历史消息，在医生结束该问诊之前您还可以对您的问题作进一步的描述。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  // counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: data.result.type, status: 1}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            } else {
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您的问诊已结束，点击确认可以查看历史消息，但是无法继续发送消息。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  // counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: data.result.type, status: 0}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            }
          }
        })
    }
  }
}])

/**
 * 聊天页面
 * @Author   xjz
 * @DateTime 2017-07-05
 */
.controller('ChatCtrl', ['$ionicPlatform', '$scope', '$state', '$rootScope', '$ionicModal', '$ionicScrollDelegate', '$ionicHistory', 'Camera', 'voice', 'CONFIG', '$ionicPopup', 'Counsels', 'Storage', 'Mywechat', '$q', 'Communication', 'Account', 'News', 'Doctor', '$ionicLoading', 'Patient', 'arrTool', 'socket', 'notify', '$timeout', function ($ionicPlatform, $scope, $state, $rootScope, $ionicModal, $ionicScrollDelegate, $ionicHistory, Camera, voice, CONFIG, $ionicPopup, Counsels, Storage, Mywechat, $q, Communication, Account, News, Doctor, $ionicLoading, Patient, arrTool, socket, notify, $timeout) {
  if ($ionicPlatform.is('ios')) cordova.plugins.Keyboard.disableScroll(true)
  $scope.input = {
    text: ''
  }
  $scope.scrollHandle = $ionicScrollDelegate.$getByHandle('myContentScroll')
  /**
   * 拉到底的动画效果
   * @Author   xjz
   * @DateTime 2017-07-05
   */
  function toBottom (animate, delay) {
    if (!delay) delay = 100
    $timeout(function () {
      $scope.scrollHandle.scrollBottom(animate)
    }, delay)
  }
  // 进入页面前：
  $scope.$on('$ionicView.beforeEnter', function () {
    $scope.timer = []
    $scope.photoUrls = {}
    $scope.msgs = []
    $scope.params = {
      msgCount: 0,
      helpDivHeight: 0,
      hidePanel: true,
      moreMsgs: true,
      UID: Storage.get('UID'),
      chatId: $state.params.chatId,
      counselcount: 0,
      counseltype: '',
      counselstatus: '',
      needlisten: 0,
      counsel: '',
      loaded: false,
      recording: false
    }
    try {
      notify.remove($scope.params.chatId)
    } catch (e) {}
    var loadWatcher = $scope.$watch('msgs.length', function (newv, oldv) {
      if (newv) {
        loadWatcher()
        var lastMsg = $scope.msgs[$scope.msgs.length - 1]
        if (lastMsg.fromID == $scope.params.UID) return
        return News.insertNews({userId: lastMsg.targetID, sendBy: lastMsg.fromID, type: '11', readOrNot: 1})
      }
    })
  })
  // 进入页面时：获取咨询状态、剩余次数
  $scope.$on('$ionicView.enter', function () {
    $rootScope.conversation.type = 'single'
    $rootScope.conversation.id = $state.params.chatId
    Counsels.getStatus({doctorId: $state.params.chatId, patientId: Storage.get('UID')})
            .then(function (data) {
              $scope.params.counseltype = data.result.type == '3' ? '2' : data.result.type
              $scope.params.counsel = data.result
              $scope.counselstatus = data.result.status

              Account.getCounts({doctorId: $scope.params.chatId, patientId: Storage.get('UID')})
                .then(function (res) {
                  if ($scope.params.loaded) {
                    return sendNotice($scope.params.counseltype, $scope.counselstatus, res.result.count)
                  } else {
                    var connectWatcher = $scope.$watch('params.loaded', function (newv, oldv) {
                      if (newv) {
                        connectWatcher()
                        return sendNotice($scope.params.counseltype, $scope.counselstatus, res.result.count)
                      }
                    })
                  }
                })
            }, function (err) {
              console.log(err)
            })
            // 显示头像
    Doctor.getDoctorInfo({userId: $state.params.chatId})
            .then(function (data) {
              $scope.photoUrls[data.results.userId] = data.results.photoUrl
            })
    Patient.getPatientDetail({ userId: $scope.params.UID })
        .then(function (response) {
          thisPatient = response.results
          $scope.photoUrls[response.results.userId] = response.results.photoUrl
        }, function (err) {

        })
    imgModalInit()
    // 先显示15条
    $scope.getMsg(15).then(function (data) {
      $scope.msgs = data
      $scope.params.loaded = true
      toBottom(true, 400)
    })
  })
  // 离开页面时：
  $scope.$on('$ionicView.leave', function () {
    for (var i in $scope.timer) clearTimeout($scope.timer[i])
    $scope.msgs = []
    if ($scope.modal)$scope.modal.remove()
    $rootScope.conversation.type = null
    $rootScope.conversation.id = ''
  })
  // 显示键盘
  $scope.$on('keyboardshow', function (event, height) {
    $scope.params.helpDivHeight = height
    setTimeout(function () {
      $scope.scrollHandle.scrollBottom()
    }, 100)
  })
  // 收起键盘
  $scope.$on('keyboardhide', function (event) {
    $scope.params.helpDivHeight = 0
    $scope.scrollHandle.resize()
  })
  $scope.$on('im:getMsg', function (event, data) {
    console.info('getMsg')
    console.log(data)
    if (data.msg.targetType == 'single' && data.msg.fromID == $state.params.chatId) {
      $scope.$apply(function () {
        insertMsg(data.msg)
      })
      News.insertNews({userId: Storage.get('UID'), sendBy: $scope.params.groupId, type: '11', readOrNot: 1})
      setTimeout(function () {
        Counsels.getStatus({ doctorId: $state.params.chatId, patientId: Storage.get('UID')})
                    .then(function (data) {
                      console.log(data)
                      $scope.counselstatus = data.result.status
                    }, function (err) {
                      console.log(err)
                    })
      }, 5000)
    }
  })
  $scope.$on('im:messageRes', function (event, data) {
    console.info('messageRes')
    console.log(data)
    if (data.msg.targetType == 'single' && data.msg.targetID == $state.params.chatId) {
      $scope.$apply(function () {
        insertMsg(data.msg)
      })
    }
  })
  // 点击图片
  $scope.$on('image', function (event, args) {
    console.log(args)
    event.stopPropagation()
    $scope.imageHandle.zoomTo(1, true)
    $scope.imageUrl = args[2].localPath || (CONFIG.mediaUrl + (args[2].src || args[2].src_thumb))
    $scope.modal.show()
  })
  // 点击语音
  $scope.$on('voice', function (event, args) {
    console.log(args)
    event.stopPropagation()
    $scope.sound = new Media(args[1],
            function () {
                // resolve(audio.media)
            },
            function (err) {
              console.log(err)
                // reject(err);
            })
    $scope.sound.play()
  })
  // 点击头像
  $scope.$on('profile', function (event, args) {
    event.stopPropagation()
    if (args[1].direct == 'receive') {
      $state.go('tab.DoctorDetail', {DoctorId: args[1].fromID})
    }
  })
  // 监听点击评价的事件
  $scope.$on('gopingjia', function (event, args) {
    event.stopPropagation()
    $state.go('tab.consult-comment', {counselId: $scope.params.counsel.counselId, doctorId: $scope.params.chatId, patientId: $scope.params.counsel.patientId.userId})
  })
  function sendNotice (type, status, cnt) {
        // var t = setTimeout(function(){
    return sendCnNotice(type, status, cnt)
        // },2000);
        // $scope.timer.push(t);
  }
  function sendCnNotice (type, status, cnt) {
    var len = $scope.msgs.length
    if (len == 0 || !($scope.msgs[len - 1].content.type == 'count-notice' && $scope.msgs[len - 1].content.count == cnt)) {
      var bodyDoc = ''
      if (type != '1') {
        if (status == '0') {
          bodyDoc = '您仍可以向患者追加回答，该消息不计费'
          bodyPat = '您没有提问次数了。如需提问，请新建咨询或问诊'
        } else {
          bodyDoc = '患者提问不限次数'
          bodyPat = '您可以不限次数进行提问'
        }
      } else {
        if (cnt <= 0 || status == '0') {
          bodyDoc = '您仍可以向患者追加回答，该消息不计费'
          bodyPat = '您没有提问次数了。如需提问，请新建咨询或问诊'
        } else {
          bodyDoc = '您还需要回答' + cnt + '个问题'
          bodyPat = '您还有' + cnt + '次提问机会'
        }
      }

      var notice = {
        type: 'count-notice',
        ctype: type,
        cstatus: status,
        count: cnt,
        bodyDoc: bodyDoc,
        bodyPat: bodyPat,
        counseltype: type
      }
      var msgJson = {
        contentType: 'custom',
        fromID: $scope.params.UID,
        fromName: thisPatient.name,
        fromUser: {
                    // avatarPath:CONFIG.mediaUrl+'uploads/photos/resized'+$scope.params.UID+'_myAvatar.jpg'
        },
        targetID: $scope.params.chatId,
        targetName: $scope.params.counsel.doctorId.name,
        targetType: 'single',
        status: 'send_going',
        createTimeInMillis: Date.now(),
        newsType: 11,
        targetRole: 'doctor',
        content: notice
      }
            // socket.emit('message',{msg:msgJson,to:$scope.params.chatId,role:'patient'});
            // $scope.pushMsg(msgJson);
      $scope.msgs.push(msgJson)
    }
  }
  $scope.getMsg = function (num) {
    console.info('getMsg')
    return $q(function (resolve, reject) {
      var q = {
        messageType: '1',
        newsType: '11',
        id1: Storage.get('UID'),
        id2: $scope.params.chatId,
        skip: $scope.params.msgCount,
        limit: num
      }
      Communication.getCommunication(q)
                .then(function (data) {
                  console.log(data)
                  var d = data.results
                  $scope.$broadcast('scroll.refreshComplete')
                  if (d == '没有更多了!') return noMore()
                  var res = []
                  for (var i in d) {
                    res.push(d[i].content)
                  }
                  if (res.length == 0) $scope.params.moreMsgs = false
                  else {
                    $scope.params.msgCount += res.length
                    if ($scope.msgs.length != 0) $scope.msgs[0].diff = ($scope.msgs[0].time - res[0].time) > 300000
                    for (var i = 0; i < res.length - 1; ++i) {
                      if (res[i].contentType == 'image') res[i].content.thumb = CONFIG.mediaUrl + res[i].content['src_thumb']
                      res[i].direct = res[i].fromID == $scope.params.UID ? 'send' : 'receive'
                      res[i].diff = (res[i].time - res[i + 1].time) > 300000
                      $scope.msgs.unshift(res[i])
                    }
                    res[i].direct = res[i].fromID == $scope.params.UID ? 'send' : 'receive'
                    res[i].diff = true
                    $scope.msgs.unshift(res[i])
                  }
                  console.log($scope.msgs)
                  resolve($scope.msgs)
                }, function (err) {
                  $scope.$broadcast('scroll.refreshComplete')
                  resolve($scope.msgs)
                })
    })
  }
  // 没有更多消息了
  function noMore () {
    $scope.params.moreMsgs = false
    setTimeout(function () {
      $scope.$apply(function () {
        $scope.params.moreMsgs = true
      })
    }, 5000)
  }
  // 多显示15条
  $scope.DisplayMore = function () {
    $scope.getMsg(15).then(function (data) {
      $scope.msgs = data
    })
  }
  $scope.scrollBottom = function () {
    $scope.scrollHandle.scrollBottom(true)
  }

  // 查看图片
  function imgModalInit () {
    $scope.zoomMin = 1
    $scope.imageUrl = ''
    $scope.sound = {}
    $ionicModal.fromTemplateUrl('partials/tabs/consult/msg/imageViewer.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.modal = modal
      $scope.imageHandle = $ionicScrollDelegate.$getByHandle('imgScrollHandle')
    })
  }

  $scope.closeModal = function () {
    $scope.imageHandle.zoomTo(1, true)
    $scope.modal.hide()
        // $scope.modal.remove()
  }
  $scope.switchZoomLevel = function () {
    if ($scope.imageHandle.getScrollPosition().zoom != $scope.zoomMin) { $scope.imageHandle.zoomTo(1, true) } else {
      $scope.imageHandle.zoomTo(5, true)
    }
  }

  $scope.updateMsg = function (msg, pos) {
    console.info('updateMsg')
    if (pos == 0) {
      msg.diff = true
    } else if (msg.hasOwnProperty('time')) {
      var m = $scope.msgs[pos - 1]
      if (m.contentType == 'custom' && m.content.type == 'count-notice' && pos > 1) {
        m = $scope.msgs[pos - 2]
      }
      if (m.hasOwnProperty('time')) {
        msg.diff = (msg.time - m.time) > 300000
      } else {
        msg.diff = false
      }
    }
    msg.content.src = $scope.msgs[pos].content.src
    msg.direct = $scope.msgs[pos].direct
    $scope.msgs[pos] = msg
  }
  $scope.pushMsg = function (msg) {
    console.info('pushMsg')
    var len = $scope.msgs.length
    if (msg.hasOwnProperty('time')) {
      if (len == 0) {
        msg.diff = true
      } else {
        var m = $scope.msgs[len - 1]
        if (m.contentType == 'custom' && m.content.type == 'count-notice' && len > 1) {
          m = $scope.msgs[len - 2]
        }
        if (m.hasOwnProperty('time')) {
          msg.diff = (msg.time - m.time) > 300000
        }
      }
    }
        // msg.direct = msg.fromID==$scope.params.UID?'send':'receive';
    $scope.params.msgCount++
    $scope.msgs.push(msg)
    toBottom(true, 200)
    toBottom(true, 600)
    setTimeout(function () {
      var pos = arrTool.indexOf($scope.msgs, 'createTimeInMillis', msg.createTimeInMillis)
      if (pos != -1 && $scope.msgs[pos].status == 'send_going') $scope.msgs[pos].status = 'send_fail'
    }, 10000)
  }
  function insertMsg (msg) {
    var pos = arrTool.indexOf($scope.msgs, 'createTimeInMillis', msg.createTimeInMillis)
    if (pos == -1) {
      $scope.pushMsg(msg)
    } else {
      $scope.updateMsg(msg, pos)
    }
  }
  function msgGen (content, type) {
    var data = {}
    if (type == 'text') {
      data = {
        text: content
      }
    } else if (type == 'image') {
      data = {
        src: content[0],
        src_thumb: content[1]
      }
    } else if (type == 'voice') {
      data = {
        src: content
      }
    }
    return {
      clientType: 'patient',
      contentType: type,
      fromID: $scope.params.UID,
      fromName: thisPatient.name,
      fromUser: {
        avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + $scope.params.UID + '_myAvatar.jpg'
      },
      targetID: $scope.params.chatId,
      targetName: $scope.params.counsel.doctorId.name,
      targetName: $scope.params.targetName,
      targetType: 'single',
      status: 'send_going',
      createTimeInMillis: Date.now(),
      newsType: '11',
      targetRole: 'doctor',
      content: data
    }
  }
  function localMsgGen (msg, url) {
    var d = {},
      type = msg.contentType
    if (type == 'image') {
      d.src = msg.content.src
      d.src_thumb = msg.content.src_thumb
      d.localPath = url
    } else if (type == 'voice') {
      d.localPath = url
      d.src = msg.content.src
    }
    return {
      clientType: 'patient',
      contentType: type,
      fromID: msg.fromID,
      fromName: msg.fromName,
      fromUser: msg.fromUser,
      targetID: msg.targetID,
      targetName: msg.targetName,
      targetType: 'single',
      status: 'send_going',
      createTimeInMillis: msg.createTimeInMillis,
      newsType: msg.newsType,
      targetRole: 'doctor',
      content: d
    }
  }

  function nomoney () {
    var alertPopup = $ionicPopup.alert({
      title: '本次咨询已结束'
    })
  }
  function sendmsg (content, type) {
    var msgJson = msgGen(content, type)
    socket.emit('message', {msg: msgJson, to: $scope.params.chatId, role: 'patient'})
    $scope.pushMsg(msgJson)
        // toBottom(true);
  }
  $scope.submitMsg = function () {
    if ($scope.counselstatus != 1) return nomoney()
    var template = {
      'userId': $scope.params.chatId, // 医生的UID
      'role': 'doctor',
      'postdata': {
        'template_id': 'DWrM__2UuaLxYf5da6sKOQA_hlmYhlsazsaxYX59DtE',
        'data': {
          'first': {
            'value': '您有一个新的' + ($scope.params.counseltype == 1 ? '咨询' : '问诊') + '消息，请及时处理',
            'color': '#173177'
          },
          'keyword1': {
            'value': $scope.params.counsel.counselId, // 咨询ID
            'color': '#173177'
          },
          'keyword2': {
            'value': $scope.params.counsel.patientId.name, // 患者信息（姓名，性别，年龄）
            'color': '#173177'
          },
          'keyword3': {
            'value': $scope.params.counsel.help, // 问题描述
            'color': '#173177'
          },
          'keyword4': {
            'value': $scope.params.counsel.time.substr(0, 10), // 提交时间
            'color': '#173177'
          },

          'remark': {
            'value': '感谢您的使用！',
            'color': '#173177'
          }
        }
      }
    }
    Mywechat.messageTemplate(template)
    sendmsg($scope.input.text, 'text')
    $scope.input.text = ''
  }
  // 上传图片
  $scope.getImage = function (type) {
    if ($scope.counselstatus != 1) return nomoney()
    $scope.showMore = false
    Camera.getPicture(type, true)
            .then(function (url) {
              console.log(url)
              var fm = md5(Date.now(), $scope.params.chatId) + '.jpg',
                d = [
                  'uploads/photos/' + fm,
                  'uploads/photos/resized' + fm
                ],
                imgMsg = msgGen(d, 'image'),
                localMsg = localMsgGen(imgMsg, url)
              $scope.pushMsg(localMsg)
              Camera.uploadPicture(url, fm)
                    .then(function () {
                      socket.emit('message', { msg: imgMsg, to: $scope.params.chatId, role: 'doctor' })
                    }, function () {
                      $ionicLoading.show({ template: '图片上传失败', duration: 2000 })
                    })
            }, function (err) {
              console.error(err)
            })
  }
  // 上传语音
  $scope.getVoice = function () {
    if ($scope.counselstatus != 1) return nomoney()
        // voice.record() do 2 things: record --- file manipulation
    $scope.params.recording = true
    voice.record()
        .then(function (fileUrl) {
          $scope.params.recording = false
            // window.JMessage.sendSingleVoiceMessage($state.params.chatId,fileUrl,CONFIG.crossKey,
            // function(res){
            //     console.log(res);
            //     viewUpdate(5,true);
            // },function(err){
            //     console.log(err);
            // });
          viewUpdate(5, true)
        }, function (err) {
          console.log(err)
        })
  }
  $scope.stopAndSend = function () {
    voice.stopRec()
  }

  $scope.chatBack = function () {
    var allowedBackviews = [
      'tab.myConsultRecord',
      'messages'
    ]
    console.log($ionicHistory.backView().stateId)
    if (allowedBackviews.indexOf($ionicHistory.backView().stateId) == -1) {
      $state.go('tab.myDoctors')
    } else {
      $ionicHistory.goBack()
    }
  }
}])

.controller('HealthInfoCtrl', ['$ionicLoading', '$scope', '$timeout', '$state', '$ionicHistory', '$ionicPopup', 'Storage', 'Health', 'Dict', function ($ionicLoading, $scope, $timeout, $state, $ionicHistory, $ionicPopup, Storage, Health, Dict) {
  var patientId = Storage.get('UID')
  // 点击返回
  $scope.Goback = function () {
    $state.go('tab.mine')
  }

  // 从字典中搜索选中的对象。
  // var searchObj = function(code,array){
  //     for (var i = 0; i < array.length; i++) {
  //       if(array[i].Type == code || array[i].type == code || array[i].code == code) return array[i];
  //     };
  //     return "未填写";
  // }
  // console.log(HealthInfo.getall());

  $scope.items = new Array()// HealthInfo.getall();
  /**
   * [获取患者健康信息并绑定数据,如无健康信息则提示]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  var RefreshHealthRecords = function () {
    $scope.noHealth = false
    /**

     * [获取患者健康信息]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId：String}
     * @return   data:{
     *              results:[   {
                                  "userId": "U201705120006",
                                  "type": "Health_003",
                                  "insertTime": "2017-07-06T05:40:21.745Z",
                                  "time": "2017-07-04T00:00:00.000Z",
                                  "label": "用药",
                                  "description": "测试一下最多三条怎么样",
                                  "comments": "",
                                  "__v": 0,
                                  "url": [
                                      "http://appmediaservice.haihonghospitalmanagement.com/uploads/photos/resizedU201705120006_1499769681666healthinfo.jpg",
                                      "http://appmediaservice.haihonghospitalmanagement.com/uploads/photos/resizedU201705120006_1499769764090healthinfo.jpg"
                                  ]
                                },
                                ...,
                                {}
                              ]
                      }
     */
    Health.getAllHealths({userId: patientId}).then(
        function (data) {
          if (data.results != '' && data.results != null) {
            $scope.items = data.results
            for (var i = 0; i < $scope.items.length; i++) {
              $scope.items[i].acture = $scope.items[i].insertTime
              // $scope.items[i].time = $scope.items[i].time.substr(0,10)
              // if ($scope.items[i].url != ""&&$scope.items[i].url!=null)
              // {
              //   $scope.items[i].url = [$scope.items[i].url]
              // }
            }
          } else {
            $scope.noHealth = true
          }
        },
        function (err) {
          console.log(err)
        }
      )
  }
  /**
   * [视图进入时调用RefreshHealthRecords]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.$on('$ionicView.enter', function () {
    RefreshHealthRecords()
  })
  /**
   * [下拉刷新，重新调用RefreshHealthRecords]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.do_refresher = function () {
    RefreshHealthRecords()
    $scope.$broadcast('scroll.refreshComplete')
  }
  /**

   * [点击健康信息，如果点击对象为删除图标，则弹窗提示并在确认后删除记录；否则跳转健康详情页面（传参id：对应的健康信息，caneidt:是否可编辑）]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    ele：Object      [MouseEvent,target为点击事件的对象]
   * @param    editId:Object     {insertTime:String,acture:String,...} 注：这两个字段一致，如果有acture可以用insertTime代替
   */
  $scope.gotoHealthDetail = function (ele, editId) {
    // console.log(ele)
    // console.log(ele.target)
    if (ele.target.nodeName == 'I') {
      var confirmPopup = $ionicPopup.confirm({
        title: '删除提示',
        template: '记录删除后将无法恢复，确认删除？',
        cancelText: '取消',
        okText: '删除'
      })

      confirmPopup.then(function (res) {
        if (res) {
          /**
           * [删除患者的某条健康信息,并删除页面绑定数据的健康信息（不确定是否必要）]
           * @Author   PXY
           * @DateTime 2017-07-11
           * @param    {userId：String,insertTime:String}
           * @return   data:Object
           */
          Health.deleteHealth({userId: patientId, insertTime: editId.acture}).then(
              function (data) {
                if (data.results == 0) {
                  for (var i = 0; i < $scope.items.length; i++) {
                    if (editId.acture == $scope.items[i].acture) {
                      $scope.items.splice(i, 1)
                      break
                    }
                  }
                }

                console.log($scope.items)
              },
              function (err) {
                console.log(err)
              }
            )
            // 20140421 zxf
            // 
            /**咨询问卷页面也有健康信息列表，删除健康信息页面的一条健康信息时也要更新咨询问卷页面的列表
             * [healthinfotimes description]
             * @type {[type]}
             */
           // 同时要删除缓存中对应的健康信息
          var healthinfotimes = angular.fromJson(Storage.get('consulthealthinfo')) ? angular.fromJson(Storage.get('consulthealthinfo')) : []
          for (var i = 0; i < healthinfotimes.length; i++) {
            if (healthinfotimes[i].time == editId.acture) {
              healthinfotimes.splice(i, 1)
              break
            }
          }
          Storage.set('consulthealthinfo', angular.toJson(healthinfotimes))
            // HealthInfo.remove(number);
            // $scope.items = HealthInfo.getall();
        }
      })
    } else {
      $state.go('tab.myHealthInfoDetail', {id: editId, caneidt: false})
    }
  }
  /**
   * [新建健康信息]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.newHealth = function () {
    $state.go('tab.myHealthInfoDetail', {id: null, caneidt: true})
  }

  // $scope.EditHealth = function(editId){
  //   console.log("健康信息");
  //   console.log(editId);
  //   $state.go('tab.myHealthInfoDetail',{id:editId});
  // }
}])

.controller('HealthDetailCtrl', ['otherTask', '$scope', '$state', '$ionicHistory', '$ionicPopup', '$stateParams', '$ionicPopover', '$ionicModal', '$ionicScrollDelegate', '$ionicLoading', '$timeout', 'Dict', 'Health', 'Storage', 'Camera', 'CONFIG', function (otherTask, $scope, $state, $ionicHistory, $ionicPopup, $stateParams, $ionicPopover, $ionicModal, $ionicScrollDelegate, $ionicLoading, $timeout, Dict, Health, Storage, Camera, CONFIG) {
  var patientId = Storage.get('UID')
  $scope.healthDetailStyle = {'top': '43px'}
  if (ionic.Platform.isIOS()) {
    $scope.healthDetailStyle = {'top': '63px'}
  }

  $scope.$watch('canEdit', function (oldval, newval) {
    console.log('oldval:' + oldval)
    console.log('newval:' + newval)
  })
  $scope.canEdit = $stateParams.caneidt
  console.log($stateParams.caneidt)
  /**
   * [点击返回，应该直接goback()就可以了]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.Goback = function () {
        // if($scope.canEdit==true){
        //     $scope.canEdit = false;
        // }else{
    if ($ionicHistory.backTitle() == null) {
      $state.go('tab.myHealthInfo')
    } else {
      $ionicHistory.goBack()
    }
    console.log(123)
    console.log($ionicHistory.backTitle())

        // }
  }

  // 点击显示大图
  $scope.zoomMin = 1
  $scope.imageUrl = ''
  $ionicModal.fromTemplateUrl('partials/tabs/consult/msg/imageViewer.html', {
    scope: $scope
  }).then(function (modal) {
    $scope.modal = modal
      // $scope.modal.show();
    $scope.imageHandle = $ionicScrollDelegate.$getByHandle('imgScrollHandle')
  })

  // $scope.healthinfoimgurl = '';
  // $ionicModal.fromTemplateUrl('partials/tabs/consult/msg/healthinfoimag.html', {
  //     scope: $scope,
  //     animation: 'slide-in-up'
  //   }).then(function(modal) {
  //     $scope.modal = modal;
  //   });
  /**
   * [点击编辑按钮，使页面进入编辑状态]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.edit = function () {
    $scope.canEdit = true
  }

  // $scope.$on('$ionicView.enter', function() {

  // })
  /**
   * [从字典中搜索选中的对象]
   * @Author   PXY
   * @DateTime 2017-07-05
   * @param    code:String/Number  [字典中的编码，比如 1 或“stage_5”]
   * @param    array:Array [字典，数组存了对象，对象中包含名称和对应的值]
   * @return   object/ '未填写'        [根据字典编码在字典中搜索到的对象]
   */
  var searchObj = function (code, array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].name == code) return array[i]
    };
    return '未填写'
  }

  $scope.labels = {} // 初始化
  $scope.health = {
    label: null,
    date: null,
    text: null,
    imgurl: null
  }
  $scope.health.imgurl = []
  /**
   * [获取标签类别]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    {category: String}
   * @return   data:{results:{
   *                           "_id": "58ede1d49b60c2d7c9f6afb6",
                                "category": "healthInfoType",
                                "details": [
                                    {
                                        "code": "Health_001",
                                        "name": "检查",
                                        "inputCode": "JC",
                                        "description": "",
                                        "invalidFlag": 0
                                    },
                                    ...,
                                    {}
                                ]
                            }}
   */
  Dict.getHeathLabelInfo({category: 'healthInfoType'}).then(
        function (data) {
          $scope.labels = data.results.details
            // 判断是修改还是新增
          if ($stateParams.id != null && $stateParams != '') {
                // 不为空为修改
                // $scope.canEdit = false;
            var info = $stateParams.id
            console.log(info)
            /**
             * [获得患者某一条健康信息完成数据绑定]
             * @Author   PXY
             * @DateTime 2017-07-11
             * @param    {userId：String}
             * @return   data:{
                            "results": {
                                "userId": "U201705120006",
                                "type": "Health_003",
                                "insertTime": "2017-07-06T05:40:21.745Z",
                                "time": "2017-07-04T00:00:00.000Z",
                                "label": "用药",
                                "description": "测试一下最多三条怎么样",
                                "comments": "",
                                "__v": 0,
                                "url": [
                                    "http://appmediaservice.haihonghospitalmanagement.com/uploads/photos/resizedU201705120006_1499769681666healthinfo.jpg",
                                    "http://appmediaservice.haihonghospitalmanagement.com/uploads/photos/resizedU201705120006_1499769764090healthinfo.jpg"
                                ]
                            }
                        }
             */
            Health.getHealthDetail({userId: patientId, insertTime: info.insertTime}).then(
                    function (data) {
                      if (data.results != '' && data.results != null) {
                        $scope.health.label = data.results.label
                        console.log(data.results.label)
                        if ($scope.health.label != null && $scope.health.label != '') {
                          $scope.health.label = searchObj($scope.health.label, $scope.labels)
                          console.log($scope.health.label)
                        }
                        $scope.health.date = data.results.time
                        $scope.health.text = data.results.description
                        if (data.results.url != '' && data.results.url != null) {
                          console.log(data.results.url)
                          $scope.health.imgurl = data.results.url
                                // $scope.showflag=true;
                        }
                      }
                      console.log($scope.health)
                    },
                function (err) {
                  console.log(err)
                })
          }
          /**
           * [如果是从任务页面填写化验任务跳转过来，则把新增类别设为化验]
           * @Author   PXY
           * @DateTime 2017-07-11
           */
          if ($ionicHistory.backView()) {
            if ($ionicHistory.backView().stateName == 'tab.tasklist') {
              var task = angular.fromJson(Storage.get('task'))
              if (task.type == 'LabTest') {
                $scope.health.label = searchObj('化验', $scope.labels)
                $scope.labTest = true
              }
            }
          }

          console.log($scope.labels)
        },
        function (err) {
          console.log(err)
        })
  // angular.toJson fromJson()
  // 2017419 zxf
  // var testtt=[];
  // testtt.push("http://121.43.107.106:8052/uploads/photos/")
  // testtt.push("http://121.43.107.10da6:8052/uploads/photos/")
  // Storage.set('test',angular.toJson(testtt))
  // console.log(testtt)
  // console.log(Storage.get('test'))
  // console.log(angular.fromJson(Storage.get('test')))
  // testtt=angular.fromJson(Storage.get('test'))

// Storage.set('localhealthinfoimg',angular.toJson(testtt))
// 进入之后local有数据但是不显示
  // $scope.health.imgurl=[];
  // var tmpimgurl=Storage.get('localhealthinfoimg');
  // console.log(tmpimgurl)
  // if(tmpimgurl!=""&&tmpimgurl!=null){
  //   console.log(tmpimgurl)
  //   $scope.health.imgurl=angular.fromJson(tmpimgurl);
  //   console.log($scope.health.imgurl)
  //   $scope.showflag=true;
  // }
  /**
   * [保存健康信息，分成修改和新建两类]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  $scope.HealthInfoSetup = function () {
    console.log($scope.health)
    if (($scope.health.label && $scope.health.date) && ($scope.health.text || $scope.health.imgurl.length)) {
      console.log($stateParams.id)
      $ionicLoading.show({
        template: '上传中...'}
        )
      if ($stateParams.id == null || $stateParams == '') {
        /**
         * [新建健康信息]
         * @Author   PXY
         * @DateTime 2017-07-11
         * @param    {userId:String,type:String,time:String,url:Array,label:String,description:String,comments:String}  注：comments参数无用
         * @return   data:Object
         */
        Health.createHealth({userId: patientId, type: $scope.health.label.code, time: $scope.health.date, url: $scope.health.imgurl, label: $scope.health.label.name, description: $scope.health.text, comments: ''}).then(
              function (data) {
                // console.log(data.results);
                // console.log(data.results.insertTime);
                // $scope.canEdit= false;
                var healthinfoToconsult = []
                // 从咨询过来的需要返回对应的健康信息
                if ($ionicHistory.backView() != null) {
                  if ($ionicHistory.backView().stateName == 'tab.consultQuestionnaire') {
                    if (Storage.get('consulthealthinfo') == '' || Storage.get('consulthealthinfo') == null || Storage.get('consulthealthinfo') == 'undefined') {
                      healthinfoToconsult.push({'time': data.results.insertTime})
                    } else {
                      healthinfoToconsult = angular.fromJson(Storage.get('consulthealthinfo'))
                      healthinfoToconsult.push({'time': data.results.insertTime})
                    }
                    Storage.set('consulthealthinfo', angular.toJson(healthinfoToconsult))
                    console.log(Storage.get('consulthealthinfo'))
                  } else if ($ionicHistory.backView().stateName == 'tab.tasklist') {
                    // 从任务过来的还需要更新任务完成的状态
                    var task = angular.fromJson(Storage.get('task'))
                    var otherTasks = angular.fromJson(Storage.get('otherTasks'))
                    // 参照tasklistctrl完成任务后的操作封装在otherTask.Postcompliance_UpdateTaskStatus里
                    otherTask.Postcompliance_UpdateTaskStatus(task, otherTasks, data.results.insertTime)
                  }
                }

                $ionicHistory.goBack()
              },
              function (err) {
                console.log(err)
              }
            )
      } else {
        // var curdate = new Date()
        /**
         * [修改健康信息]
         * @Author   PXY
         * @DateTime 2017-07-11
         * @param    {userId:String,type:String,time:String,url:Array,label:String,description:String,comments:String,insertTime:String}  注：comments参数无用
         * @return   data：Object
         */
        Health.modifyHealth({userId: patientId, type: $scope.health.label.code, time: $scope.health.date, url: $scope.health.imgurl, label: $scope.health.label.name, description: $scope.health.text, comments: '', insertTime: $stateParams.id.insertTime}).then(
              function (data) {
                console.log(data.data)
                // $scope.canEdit= false;
                $ionicHistory.goBack()
              },
              function (err) {
                console.log(err)
              }
            )
      }
    } else {
      $ionicLoading.show({
        template: '请用文字描述或者上传图片！',
        duration: 1000
      })
    }
  }
  // 摧毁时隐藏ionicLoading
  $scope.$on('$destroy', function () {
      // console.log('destroy');

    $ionicLoading.hide()
  })

  // --------datepicker设置----------------
  var monthList = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  var weekDaysList = ['日', '一', '二', '三', '四', '五', '六']
  var datePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject4.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.health.date = yyyy + '-' + m + '-' + d
    }
  }
  $scope.datepickerObject4 = {
    titleLabel: '时间日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    mondayFirst: false,    // Optional
    // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      datePickerCallback(val)
    }
  }
  // 上传图片的点击事件----------------------------
  $scope.onClickCamera = function ($event) {
    $scope.openPopover($event)
  }

 // 上传照片并将照片读入页面-------------------------
  var photo_upload_display = function (imgURI) {
   // 给照片的名字加上时间戳
    var temp_photoaddress = Storage.get('UID') + '_' + new Date().getTime() + 'healthinfo.jpg'
    console.log(temp_photoaddress)
    Camera.uploadPicture(imgURI, temp_photoaddress)
    .then(function (res) {
      var data = angular.fromJson(res)
      // 图片路径
      $scope.health.imgurl.push(CONFIG.mediaUrl + String(data.path_resized))
      // $state.reload("tab.mine")
      // Storage.set('localhealthinfoimg',angular.toJson($scope.health.imgurl));
      console.log($scope.health.imgurl)
      // $scope.showflag=true;
    }, function (err) {
      console.log(err)
      reject(err)
    })
  }
  /**
   * *点击上传图片事件的弹框
   * @Author   ZXF
   * @DateTime 2017-07-14
   * @param    {[type]}   popover) {               $scope.popover [description]
   * @return   {[type]}            [description]
   */
  $ionicPopover.fromTemplateUrl('partials/pop/cameraPopover.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (popover) {
    $scope.popover = popover
  })
  $scope.openPopover = function ($event) {
    $scope.popover.show($event)
  }
  $scope.closePopover = function () {
    $scope.popover.hide()
  }
  // Cleanup the popover when we're done with it!
  $scope.$on('$destroy', function () {
    $scope.popover.remove()
  })
  // Execute action on hide popover
  $scope.$on('popover.hidden', function () {
    // Execute action
  })
  // Execute action on remove popover
  $scope.$on('popover.removed', function () {
    // Execute action
  })

  // 相册键的点击事件---------------------------------
  $scope.onClickCameraPhotos = function () {
   // console.log("选个照片");
    $scope.choosePhotos()
    $scope.closePopover()
  }
  /**
   * *从用户相册获取图片
   * @Author   ZXF
   * @DateTime 2017-07-14
   * @return   {[type]}   [description]
   */
  $scope.choosePhotos = function () {
    Camera.getPictureFromPhotos('gallery', true).then(function (data) {
      // data里存的是图像的地址
      // console.log(data);
      var imgURI = data
      photo_upload_display(imgURI)
    }, function (err) {
      // console.err(err);
      var imgURI
    })// 从相册获取照片结束
  } // function结束

  $scope.getPhoto = function () {
    // console.log("要拍照了！");
    $scope.takePicture()
    $scope.closePopover()
  }
  $scope.isShow = true
  /**
   * *从用户的拍照动作获取图片
   * @Author   ZXF
   * @DateTime 2017-07-14
   * @return   {[type]}   [description]
   */
  $scope.takePicture = function () {
    Camera.getPicture('cam', true).then(function (data) {
      var imgURI = data
      photo_upload_display(imgURI)
    }, function (err) {
        // console.err(err);
      var imgURI
    })// 照相结束
  } // function结束

    // $scope.openModal = function() {
    //   $scope.modal.show();
    // };
    // $scope.closeModal = function() {
    //   $scope.modal.hide();
    // };
    // //Cleanup the modal when we're done with it!
    // $scope.$on('$destroy', function() {
    //   $scope.modal.remove();
    // });
    // // Execute action on hide modal
    // $scope.$on('modal.hidden', function() {
    //   // Execute action
    // });
    // // Execute action on remove modal
    // $scope.$on('modal.removed', function() {
    //   // Execute action
    // });

  // //点击图片返回
  /**
   * *点击查看大图
   * @Author   ZXF
   * @DateTime 2017-07-14
   * @param    {[type]}   resizedpath [description]
   * @return   {[type]}               [description]
   */
  $scope.showoriginal = function (resizedpath) {
    // $scope.openModal();
    // console.log(resizedpath)
    var originalfilepath = CONFIG.imgLargeUrl + resizedpath.slice(resizedpath.lastIndexOf('/') + 1).substr(7)
    // console.log(originalfilepath)
    // $scope.doctorimgurl=originalfilepath;

    $scope.imageHandle.zoomTo(1, true)
    $scope.imageUrl = originalfilepath
    $scope.modal.show()
  }
  $scope.closeModal = function () {
    $scope.imageHandle.zoomTo(1, true)
    $scope.modal.hide()
      // $scope.modal.remove()
  }
  $scope.switchZoomLevel = function () {
    if ($scope.imageHandle.getScrollPosition().zoom != $scope.zoomMin) { $scope.imageHandle.zoomTo(1, true) } else {
      $scope.imageHandle.zoomTo(5, true)
    }
  }

  $scope.deleteimg = function (index) {
    // somearray.removeByValue("tue");
    console.log($scope.health.imgurl)
    $scope.health.imgurl.splice(index, 1)
    // Storage.set('tempimgrul',angular.toJson($scope.images));
  }

  $scope.$on('$ionicView.leave', function () {
    $scope.modal.remove()
  })
}])

.controller('MoneyCtrl', ['$scope', '$state', '$ionicHistory', 'Account', 'Storage', 'Patient', function ($scope, $state, $ionicHistory, Account, Storage, Patient) {
  var PID = Storage.get('UID')
  var docid = ''
  $scope.Goback = function () {
    $state.go('tab.mine')
  }
  //  剩余咨询次数
  $scope.TimesRemainZX = '0'
  //剩余问诊次数
  $scope.TimesRemainWZ = '0'
  /**免费咨询次数
   * [TimesRemainZX description]
   * @type {String}
   */
  $scope.freeTimesRemain = '0'
  // 20170504 zxf

  /**
   * [加载患者账号信息]
   * @Author   ZXF
   * @DateTime 2017-07-11
   */
  var LoadMyAccount = function () {
    /**
     * [获取剩余免费次数]
     * @Author   ZXF
     * @DateTime 2017-07-11
     * @param    {patientId：String}
     * @return   data:{result:{freeTimes:Number,totalCount:Number}}
     */
    Account.getCounts({patientId: Storage.get('UID')}).then(
    function (data) {
      console.log(data)
      $scope.freeTimesRemain = data.result.freeTimes
      // $scope.TimesRemain=data.result.totalCount;
    },
    function (err) {
      console.log(err)
    }
  )
  }
  // 0515 zxf
  /**
   * [获取尚未完成的咨询和问诊]  注：应该也放在LoadMyAccount里面
   * @Author   ZXF
   * @DateTime 2017-07-11
   * @param    {patientId：String}
   * @return   data:{result:{count1:Number,count2:Number}}
   */
  Account.getCountsRespective({patientId: Storage.get('UID')}).then(function (data) {
    $scope.TimesRemainZX = data.result.count1
    $scope.TimesRemainWZ = data.result.count2
  }, function (err) {
    console.log(err)
  })
  // 进入视图时调用LoadMyAccount
  $scope.$on('$ionicView.enter', function () {
    LoadMyAccount()
  })
  // 下拉刷新，重新调用LoadMyAccount
  $scope.do_refresher = function () {
    LoadMyAccount()
    $scope.$broadcast('scroll.refreshComplete')
  }
}])

.controller('messageCtrl', ['$ionicPopup', 'Counsels', '$q', '$scope', '$state', '$ionicHistory', 'News', 'Storage', 'Doctor', function ($ionicPopup, Counsels, $q, $scope, $state, $ionicHistory, News, Storage, Doctor) {
  /**
   * [获取发送者（医生）的姓名和头像，绑定页面数据]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    sender:String
   * @param    doctor:Object
   */
  var getDocNamePhoto = function (sender, doctor) {
    /**
     * [获取发送者（医生）的姓名和头像,并为doctor对象加上姓名和头像的属性]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId：String}
     * @return   data:{results:{name:String,photorUrl:String,...}}
     */
    Doctor.getDoctorInfo({userId: sender}).then(
            function (data) {
              if (data.results) {
                doctor.docName = data.results.name
                doctor.docPhoto = data.results.photoUrl
              }
            }, function (err) {
      console.log(err)
    })
            // return doctor;
  }
  /**
   * [获取不同类别的最新消息]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  var Lastnews = function () {
    var receiver = Storage.get('UID')
    News.getNews({userId: receiver, type: 1}).then(
            function (data) {
              if (data.results.length) {
                console.log(data.results)
                $scope.pay = data.results[0]
              }
            }, function (err) {
      console.log(err)
    }
        )

    News.getNews({userId: receiver, type: 2}).then(
            function (data) {
              if (data.results.length) {
                console.log(data.results)
                $scope.alert = data.results[0]
              }
            }, function (err) {
      console.log(err)
    }
        )

    News.getNews({userId: receiver, type: 3}).then(
            function (data) {
              if (data.results.length) {
                console.log(data.results)
                $scope.task = data.results[0]
              }
            }, function (err) {
      console.log(err)
    }
        )
    /**
     * [获取保险的最新消息]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId：String,type:Number}  注：type为5是保险消息，应该写在constant里
     * @return   data:{results:[{},...,{}]}
     */
    News.getNews({userId: receiver, type: 5}).then(
            function (data) {
              if (data.results.length) {
                console.log(data.results)
                $scope.insurance = data.results[0]
              }
            }, function (err) {
      console.log(err)
    }
        )
    /**
     * [获取医患沟通的未读消息（latest）]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId:String,type:Number,readOrNot:Number,userRole:String} 注：11为医患沟通的消息类型，0标志消息未读,userRole指接收客户端
     * @return   data:{results:Array}
     */
    News.getNewsByReadOrNot({userId: receiver, type: 11, readOrNot: 0, userRole: 'patient'}).then(
            function (data) {
              console.log(data)
              if (data.results.length) {
                var mesFromDoc = new Array()// 不需要
                var singleMes = new Object()// 不需要
                // 获取每条消息的医生姓名和头像并绑定数据
                for (var x in data.results) {
                  getDocNamePhoto(data.results[x].sendBy, data.results[x])
                }
              }
              $scope.chats = data.results
            }, function (err) {
      console.log(err)
    }
        )
  }
  // 进入视图时调用Lastnews
  $scope.$on('$ionicView.enter', function () {
    Lastnews()
  })
  // 下拉刷新
  $scope.do_refresher = function () {
    Lastnews()
    $scope.$broadcast('scroll.refreshComplete')
  }
  // 返回
  $scope.Goback = function () {
    $state.go(Storage.get('messageBackState'))
      // $ionicHistory.goBack();
  }
  /**
   * [把消息设置为已读]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    {readOrNot：Number,type:Number...}
   */
  var SetRead = function (message) {
    console.log(message)
    if (message.readOrNot == 0) {
      message.readOrNot = 1
      News.insertNews(message).then(
                function (data) {
                  console.log(data)
                  Lastnews()// 应该没有必要
                }, function (err) {
        console.log(err)
      }
            )
    }
  }
  // 点击咨询信息，函数注释参照consultRecordCtrl中点击咨询记录（缺乏点击头像的部分，应该也要补回来）
  $scope.getConsultRecordDetail = function (chat) {
    var template = ''
    var counseltype = 0
    var counselstatus = ''
    var doctorId = chat.sendBy

        // zz最新方法根据docid pid 不填写type获取最新一条咨询信息
    Counsels.getStatus({doctorId: doctorId, patientId: Storage.get('UID')})
        .then(function (data) {
          console.log(data.result)
          console.log(data.result.type)
          console.log(data.result.status)
          if (data.result.type == 1) {
            if (data.result.status == 1) { // 有尚未完成的咨询 直接进入
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您有尚未结束的咨询，点击确认可以查看历史消息，在医生完成三次问答之前，您还可以对您的问题作进一步的描述。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: 1, status: 1}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            } else {
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您的咨询已结束，点击确认可以查看历史消息，但是无法继续发送消息。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: 1, status: 0}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            }
          } else if (data.result.type == 2 || data.result.type == 3) {
            if (data.result.status == 1) { // 尚未结束的问诊
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的问诊，点击确认可以查看历史消息，在医生结束该问诊之前您还可以对您的问题作进一步的描述。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: data.result.type, status: 1}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            } else {
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您的问诊已结束，点击确认可以查看历史消息，但是无法继续发送消息。',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  counseltype
                  $state.go('tab.consult-chat', {chatId: doctorId, type: data.result.type, status: 0}) // 虽然传了type和status但不打算使用 byZYH
                }
              })
            }
          }
        })
        // SetRead(chat);
  }
  /**
   * [点击除咨询信息外的其他信息，页面跳转设置消息已读]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    {readOrNot：Number,type:Number...}
   */
  $scope.getMessageDetail = function (message) {
    console.log(message)
    Storage.set('getMessageType', message.type)
    $state.go('messagesDetail')
    SetRead(message)
  }
}])

.controller('VaryMessageCtrl', ['Doctor', 'News', '$scope', 'Message', '$state', '$ionicHistory', 'Storage', function (Doctor, News, $scope, Message, $state, $ionicHistory, Storage) {
  // 是否保险消息
  $scope.notInsurance = true
  // 参照messageCtrl同名函数
  var getDocNamePhoto = function (sender, doctor) {
    Doctor.getDoctorInfo({userId: sender}).then(
            function (data) {
              if (data.results) {
                doctor.docName = data.results.name
                doctor.docPhoto = data.results.photoUrl
              }
                // console.log(doctor);
            }, function (err) {
      console.log(err)
    })
            // return doctor;
  }
  /**
   * [根据消息类型显示页面标题和图标，获取该类型消息并绑定数据]
   * @Author   PXY
   * @DateTime 2017-07-11
   */
  var varyMessage = function () {
    console.log(Storage.get('getMessageType'))
    switch (Storage.get('getMessageType')) {
      case '1':
        $scope.varyMes = {name: '支付', avatar: 'payment.png'}
        console.log($scope.varyMes)
        break
      case '2':
        $scope.varyMes = {name: '警报', avatar: 'alert.png'}
        break
      case '3':
        $scope.varyMes = {name: '任务', avatar: 'task.png'}
        break
      case '5':
        $scope.varyMes = {name: '保险'}
        $scope.notInsurance = false
        break
    }
    /**
     * [获取某种类型所有的消息,如果是保险消息还要获取发送者的姓名和头像]
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId：String，type:Number}
     * @return   data:{results:[
     *                       {
                                "_id": "59250378b0432f19bcc841cc",
                                "messageId": "M201705240002",
                                "userId": "U201705120006",
                                "type": 5,
                                "readOrNot": 0,
                                "sendBy": "U201612260027",
                                "time": "2017-05-24T03:52:24.951Z",
                                "description": "医生给您发送了一条保险消息",
                                "__v": 0
                            },...,
                            {}
                      ]}
     */
    Message.getMessages({userId: Storage.get('UID'), type: Storage.get('getMessageType')}).then(
            function (data) {
              if (data.results.length) {
                console.log(data.results)
                if (Storage.get('getMessageType') == 5) {
                  for (var x in data.results) {
                    getDocNamePhoto(data.results[x].sendBy, data.results[x])
                  }
                }
                $scope.messages = data.results
              }
            }, function (err) {
      console.log(err)
    })
  }
  // 进入页面调用方法varyMessage
  $scope.$on('$ionicView.enter', function () {
    varyMessage()
  })
  // 下拉刷新
  $scope.do_refresher = function () {
    varyMessage()

    /**
     * [获取某种类型的未读消息（latest），把未读置为已读] 注：参数里应该加上userRole
     * @Author   PXY
     * @DateTime 2017-07-11
     * @param    {userId:String,type:Number,readOrNot:Number,userRole:String} 注：11为医患沟通的消息类型，0标志消息未读,userRole指接收客户端
     * @return   data:{results:Array}
     */
    News.getNewsByReadOrNot({userId: Storage.get('UID'), type: Storage.get('MessageType'), readOrNot: 0}).then(function (data) {
      if (data.results) {
        console.log(data.results)
        if (data.results[0].readOrNot == 0) {
          data.results[0].readOrNot = 1
                  /**
                   * [把消息置为已读]
                   * @Author   PXY
                   * @DateTime 2017-07-11
                   * @param    {userId:String，sendBy:String，type:Number，title:Number，description:String，url:String，messageId:String}
                   * @return   success:Object
                   */
          News.insertNews(data.results[0]).then(
                            function (success) {
                              console.log(success)
                            }, function (err) {
            console.log(err)
          }
                        )
        }
      }
    }, function (err) {

    })

    $scope.$broadcast('scroll.refreshComplete')
  }
  /**
   * [点击某条保险消息，点击医生头像则跳转医生详情，否则则跳转保险页面]
   * @Author   PXY
   * @DateTime 2017-07-11
   * @param    ele：Object      [MouseEvent,target为点击事件的对象]
   * @param    doctorId:String
   * @param    MessageType:Number
   */
  $scope.MoreMessageDetail = function (ele, doctorId, MessageType) {
    if (MessageType == 5) {
      if (ele.target.nodeName == 'IMG') {
        $state.go('tab.DoctorDetail', {DoctorId: doctorId})
      } else {
        $state.go('insurance')
      }
    }
  }
    // var messageType = Storage.get("getMessageType")
    // $scope.messages=angular.fromJson(Storage.get("allMessages"))[messageType]
    // console.log($scope.messages)

    // if(messageType=='ZF')
    //     $scope.avatar='payment.png'
    // else if(messageType=='JB')
    //     $scope.avatar='alert.png'
    // else if(messageType=='RW')
    //     $scope.avatar='task.png'
    // else if(messageType=='BX')
    //     $scope.avatar='security.png'
  // 返回
  $scope.Goback = function () {
    $ionicHistory.goBack()
  }
}])

.controller('DoctorCtrl', ['$interval', 'News', '$q', '$http', '$cordovaBarcodeScanner', 'Storage', '$ionicLoading', '$scope', '$state', '$ionicPopup', '$ionicHistory', 'Dict', 'Patient', '$location', 'Doctor', 'Counsels', 'Account', 'CONFIG', 'Expense', 'socket', 'Mywechat', function ($interval, News, $q, $http, $cordovaBarcodeScanner, Storage, $ionicLoading, $scope, $state, $ionicPopup, $ionicHistory, Dict, Patient, $location, Doctor, Counsels, Account, CONFIG, Expense, socket, Mywechat) {
  /**
   * [获取新消息]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  var GetUnread = function () {
    /**
     * [从数据库获取未读消息，如果有页面右上角铃铛则显示红点提示]
     * @Author   PXY
     * @DateTime 2017-07-10
     * @param    {userId：String,readOrNot:Number,userRole:String} 注：readOrNot为0表示未读消息，为1则为已读消息；userRole为接收客户端
     * @return data:Array
     *         err
     */
    News.getNewsByReadOrNot({userId: Storage.get('UID'), readOrNot: 0, userRole: 'patient'}).then(//
            function (data) {
                // console.log(data);
              if (data.results.length) {
                $scope.HasUnreadMessages = true
                    // console.log($scope.HasUnreadMessages);
              } else {
                $scope.HasUnreadMessages = false
              }
            }, function (err) {
      console.log(err)
    })
  }
  /**
   * [消息轮询启动，每隔2s获取是否有未读消息]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.$on('$ionicView.enter', function () {
    // 在我的医生页面才启动
    if ($ionicHistory.currentView().stateId === 'tab.myDoctors') {
      // console.log('enter')
      RefreshUnread = $interval(GetUnread, 2000)
    }
  })
  /**
   * [消息轮询取消]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.$on('$ionicView.leave', function () {
      // console.log($ionicHistory.currentView());
      // // 在我的医生页面才取消
    if ($ionicHistory.currentView().stateId !== 'tab.myDoctors') {
      // console.log('destroy')
      $interval.cancel(RefreshUnread)
    }
  })
    // 进入咨询页面之前先判断患者的个人信息是否完善，若否则禁用咨询和问诊，并弹窗提示完善个人信息
  $scope.$on('$ionicView.beforeEnter', function () {
    /**
     * [获取患者个人信息]
     * @Author   PXY
     * @DateTime 2017-07-10
     * @param {userId:String}
     * @return data:{results:Object/String}  注：如果填了个人信息返回的为对象，如果没填则为字符串
     */
    Patient.getPatientDetail({userId: Storage.get('UID')}).then(function (data) {
      // console.log(data)
      if (data.results == '没有填写个人信息') {
        // console.log('123')
        $scope.DisabledConsult = true
        var unComPatPopup = $ionicPopup.show({
          title: '温馨提示',
          template: '您的个人信息并未完善，无法向医生发起咨询或问诊，请先前往 [我的->个人信息] 完善您的个人信息。',
          buttons: [
            {
              text: '取消',
              onTap: function (e) {
                                // e.preventDefault();
              }
            },
            {
              text: '确定',
              type: 'button-calm',
              onTap: function (e) {
                $state.go('userdetail', {last: 'consult'})
              }
            }
          ]
        })
      } else {
        $scope.DisabledConsult = false
      }
    }, function (err) {
      console.log(err)
      $ionicLoading.show({template: '网络错误！', duration: 1000})
    })
  })
   // 清空搜索框
  $scope.searchCont = {}
  /**
   * [点击返回，返回我的医生页面]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.Goback = function () {
    $state.go('tab.myDoctors')
    // console.log($ionicHistory.backView())
    // console.log(123);
    // $ionicHistory.goBack();
  }

  $scope.alldoctortype = '88px'
  if (ionic.Platform.isIOS()) {
    $scope.alldoctortype = '108px'
  }
  /**
   * [点击搜索框的删除键，清空搜索内容，并重新获取医生列表]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.clearSearch = function () {
    $scope.searchCont = {}
        // 清空之后获取所有医生
    ChangeSearch()
  }

  /**
   * [获取我的主管医生信息,如果有则绑定页面数据，如果没有则显示没有主管医生]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param {userId:String}
   * @return   data:{results:{doctorId:{userId:String,name:String,title:String,department:String,......}}}
   *           err
   */
  var mydoc = function () {
    Patient.getMyDoctors({userId: Storage.get('UID')}).then(
        function (data) {
            // console.log(data.results);
          if (data.results.doctorId) {
              // console.log(111)
            $scope.hasDoctor = true
            $scope.doctor = data.results.doctorId
          } else {
            $scope.hasDoctor = false
          }
        }, function (err) {
      console.log(err)
    })
  }
  mydoc()

  $scope.scanbarcode = function () {
      // console.log(Storage.get("UID"))
    $cordovaBarcodeScanner.scan().then(function (imageData) {
          // alert(imageData.text);
      if (imageData.cancelled) { return }
      Patient.bindingMyDoctor({'patientId': Storage.get('UID'), 'doctorId': imageData.text}).then(function (res) {
        console.log(res)
            // alert(JSON.stringify(res))
        if (res.results == '修改成功' || res.results.errcode != '' || res.results.errcode != null) {
          $ionicPopup.alert({
            title: '绑定成功！'
          }).then(function (res) {
            mydoc()
            $scope.hasDoctor = true
                // $state.go('tab.myDoctors');
          })
        } else if (res.result == '不存在的医生ID！') {
          $ionicPopup.alert({
            title: '不存在的医生ID！'
          })
        }
      }, function () {
      })
    }, function (error) {
      console.log('An error happened -> ' + error)
    })
  }
  // 页面基本信息初始化
  $scope.Provinces = {}
  $scope.Cities = {}
    // $scope.Districts={};
  $scope.Hospitals = {}
  $scope.doctors = []
  $scope.doctor = ''
  $scope.moredata = true
  var pagecontrol = {skip: 0, limit: 10}
  var alldoctors = new Array()
  /**
   * [获取所有省份]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param    {level:Number} 注：level为1查询所有省份
   * @return   data:{results:[{_id: String,code: String,province: String,city:String,district: String,name: String,level: Number},...,{}]}
   */
  Dict.getDistrict({level: 1}).then(
        function (data) {
          $scope.Provinces = data.results
        },
        function (err) {
          console.log(err)
        }
    )
  /**
   * [分页显示，主要由skip参数控制，表示从第几条开始读取limit条记录，ion-infinite-scroll控件触发]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param     {province: String, city: String, workUnit: String, name: String} 注：搜索及筛选的参数
   */
  $scope.loadMore = function (params) {
        // $scope.$apply(function() {
    console.log('i am  loadMore')
    if (!params) {
      params = {province: '', city: '', workUnit: '', name: ''}
    }
    /**
     * [获取医生列表]
     * @Author   PXY
     * @DateTime 2017-07-10
     * @param    {skip: Number, limit: Number, province: String, city: String, workUnit: String, name：String}
     * @return   data:{results:[{name:String,userId:String,title:String,workUnit:String,...},..,{}]}
     *           err
     */
    Patient.getDoctorLists({skip: pagecontrol.skip, limit: pagecontrol.limit, province: params.province, city: params.city, workUnit: params.workUnit, name: params.name}).then(function (data) {
      // console.log(data.results)
      $scope.$broadcast('scroll.infiniteScrollComplete')

      alldoctors = alldoctors.concat(data.results)
      $scope.doctors = alldoctors
      if (alldoctors.length == 0) {
        console.log('aaa')
        $ionicLoading.show({
          template: '没有医生', duration: 1000
        })
      }
                // $scope.nexturl=data.nexturl;
      var skiploc = data.nexturl.indexOf('skip')
      pagecontrol.skip = data.nexturl.substring(skiploc + 5)
      console.log(pagecontrol.skip)
      if (data.results.length < pagecontrol.limit) { $scope.moredata = false } else { $scope.moredata = true };
    }, function (err) {
      console.log(err)
    })
  }

  /**
   * [更改筛选或搜索条件之后重新读取医生列表]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  var ChangeSearch = function () {
    pagecontrol = {skip: 0, limit: 10}
    alldoctors = new Array()
        // console.log($scope.Province);
    var _province = ($scope.Province && $scope.Province.province) ? $scope.Province.province.name : ''
    var _city = ($scope.City && $scope.City.city) ? $scope.City.city.name : ''
        // var _district = ($scope.District&&$scope.District.district)? $scope.District.district.name:"";
        // console.log($scope.Hospital);
    var _hospital = ($scope.Hospital && $scope.Hospital.hospitalName) ? $scope.Hospital.hospitalName.hospitalName : ''
    console.log(_hospital)
    var params = {province: _province, city: _city, workUnit: _hospital, name: ($scope.searchCont.t || '')}
    $scope.loadMore(params)
  }
  /**
   * [搜索内容变化后待用changeSearch]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.search = function () {
        // console.log("清空了");
    ChangeSearch()
  }
  /**
   * [选中省份之后获取该省份所有城市,把城市、医院的筛选条件清空，根据更改后的条件获取医生列表]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param    province:{_id: String, code: String, province: String, city: String, district: String,name:String,level:Number}
   */
  $scope.getCity = function (province) {
    // console.log(province)
    if (province != null) {
      /**
       * [从数据库获取某省份的所有城市]
       * @Author   PXY
       * @DateTime 2017-07-10
       * @param    {level: Number, province:String, city: String}
       * @return   data:{[{_id: String, code: String, province: String, city: String, district: String,name:String,level:Number},..,{}]}
       */
      Dict.getDistrict({level: 2, province: province.province, city: ''}).then(
              function (data) {
                $scope.Cities = data.results
                // console.log($scope.Cities)
              },
              function (err) {
                console.log(err)
              }
            )
    } else {
      $scope.Cities = {}
            // $scope.Districts ={};
      $scope.Hospitals = {}
    }

    $scope.City = ''
    $scope.Hospital = ''
    ChangeSearch()
  }
  /**
   * [根据选中省份，城市获取该地区的所有医院，把医院的筛选条件清空，根据更改后的条件获取医生列表]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param    province:{_id: String, code: String, province: String, city: String, district: String,name:String,level:Number}
   * @param    city:{_id: String, code: String, province: String, city: String, district: String,name:String,level:Number}
   */
  $scope.getHospital = function (province, city) {
    console.log(city)
    if (city != null) {
      /**
       * [根据选中省份，城市获取该地区的所有医院]
       * @Author   PXY
       * @DateTime 2017-07-10
       * @param    {province:String,city:String}
       * @return   data:{[{city:String,hospitalName:String,province:String,_id:String},..,{}]}            [description]
       */
      Dict.getHospital({province: province.name, city: city.name}).then(
          function (data) {
            console.log(data)
            $scope.Hospitals = data.results
          },
          function (err) {
            console.log(err)
          }
        )
    } else {
      $scope.Hospitals = {}
    }

    $scope.Hospital = ''
    ChangeSearch()
    // console.log($scope.Hospital)
  }
  /**
   * *[android在拉起微信支付时耗时很长，添加loading画面]
   * @Author   ZXF
   * @DateTime 2017-07-05
   * @return   {[type]}
   */
  var ionicLoadingshow = function () {
    $ionicLoading.show({
      template: '加载中...'
    })
  }
  var ionicLoadinghide = function () {
    $ionicLoading.hide()
  }
  /**
   * [根据选中医院，重新获取医生列表]
   * @Author   PXY
   * @DateTime 2017-07-10
   * @param    hospital：{city:String,hospitalName:String,province:String,_id:String}
   */
  $scope.getDoctorByHospital = function (hospital) {
    ChangeSearch()
  }
  /**
   * [点击更多医生跳转到医生列表页面]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.allDoctors = function () {
    $state.go('tab.AllDoctors')
    // $scope.loadMore()
  }
  /**
   * [consultable 为防止用户因为在方法调用过程中多次点击咨询或者问诊设置的flag ==1时能点击，==0时不能]
   * @type {Number}
   */
  $scope.consultable = 1
  /**
   * *[根据用户点击事件进入咨询或者问诊]
   * @Author   ZXF
   * @DateTime 2017-07-05
   * @DoctorId    {[string]}
   * @docname    {[string]}
   * @charge1    {[int]}医生设置的咨询费用
   * @charge2    {[int]}医生设置的问诊费用
   * @return   {[type]}
   */
  $scope.question = function (DoctorId, docname, charge1, charge2) {
    console.log(docname)

    /**
   * *[获取用户当前咨询相关的信息，是否正在进行]
   * @Author   ZXF
   * @DateTime 2017-07-05
   * @doctorId    {[string]}用户咨询医生id
   * @patientId    {[string]}
   * @return   {[type]}status==1 有正在进行的咨询或者问诊 直接进咨询界面
   */
    Counsels.getStatus({doctorId: DoctorId, patientId: Storage.get('UID')})
          .then(function (data) {
            // zxf 判断条件重写
            if (data.result != '请填写咨询问卷!' && data.result.status == 1) { // 有尚未完成的咨询或者问诊
              if (data.result.type == 1) {
                if ($scope.consultable == 1) {
                  $scope.consultable = 0
                  $ionicPopup.confirm({
                    title: '咨询确认',
                    template: '您有尚未结束的咨询，点击确认继续上一次咨询！',
                    okText: '确认',
                    cancelText: '取消'
                  }).then(function (res) {
                    if (res) {
                      $scope.consultable = 1
                      $state.go('tab.consult-chat', {chatId: DoctorId, type: 1, status: 1})
                    } else {
                      $scope.consultable = 1
                    }
                  })
                }
              } else {
                if ($scope.consultable == 1) {
                  $scope.consultable = 0
                  $ionicPopup.confirm({
                    title: '咨询确认',
                    template: '您有尚未结束的问诊，点击确认继续上一次问诊！',
                    okText: '确认',
                    cancelText: '取消'
                  }).then(function (res) {
                    if (res) {
                      $scope.consultable = 1
                      $state.go('tab.consult-chat', {chatId: DoctorId, type: data.result.type, status: 1})
                    } else {
                      $scope.consultable = 1
                    }
                  })
                }
              }
            } else { // 没有进行中的问诊咨询 查看是否已经付过费
              // console.log("fj;akfmasdfzjl")
              /**
               * *[没有正在进行的咨询，判断用户剩余count]count==999：有已付钱但尚未新建的问诊，进入咨询问卷
               * count==3 有已付钱但尚未新建的咨询，进入咨询问卷
               * else 判断freetime是否为零，有免费咨询次数使用免费咨询次数进入咨询问卷
               * else 拉起微信支付
               * @Author   ZXF
               * @DateTime 2017-07-05
               * @param    {[type]}
               * @return   {[type]}
               */
              Account.getCounts({patientId: Storage.get('UID'), doctorId: DoctorId}).then(function (data) {
                console.log(data.result.freeTimes)
                if (data.result.count == 999) { // 上次有购买问诊 但是没有新建问诊
                  if ($scope.consultable == 1) {
                    $scope.consultable = 0
                    $ionicPopup.confirm({
                      title: '咨询确认',
                      template: '您上次付费的问诊尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。',
                      okText: '确认',
                      cancelText: '取消'
                    }).then(function (res) {
                      if (res) {
                        $scope.consultable = 1
                        $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                      } else {
                        $scope.consultable = 1
                      }
                    })
                  }
                } else if (data.result.count == 3) {
                  if ($scope.consultable == 1) {
                    $scope.consultable = 0
                    $ionicPopup.confirm({
                      title: '咨询确认',
                      template: '您上次付费的咨询尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。',
                      okText: '确认',
                      cancelText: '取消'
                    }).then(function (res) {
                      if (res) {
                        $scope.consultable = 1
                        $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                      } else {
                        $scope.consultable = 1
                      }
                    })
                  }
                } else if (data.result.freeTimes > 0) { // 判断是否已经花过钱了，花过但是还没有新建咨询成功 那么跳转问卷
                  if ($scope.consultable == 1) {
                    console.log(DoctorId)
                    $scope.consultable = 0
                    $ionicPopup.confirm({
                      title: '咨询确认',
                      template: '您还有剩余免费咨询次数，进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。点击确认进入免费咨询',
                      okText: '确认',
                      cancelText: '取消'
                    }).then(function (res) {
                      if (res) {
                        $scope.consultable = 1
                          // var allresult=[]
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: 0}).then(function (data) {
                            console.log(data)
                            return data
                                // allresult.push(data)
                          }, function (err) {
                            console.log(err)
                          }),
                              // 免费咨询次数减一 count+3
                              /**
                               * *[免费咨询次数减一]
                               * @Author   ZXF
                               * @DateTime 2017-07-05
                               * @patientId    {[string]}
                               * @return   {[type]}
                               */
                          Account.updateFreeTime({patientId: Storage.get('UID')}).then(function (data) {
                            /**
                             * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                             * @Author   ZXF
                             * @DateTime 2017-07-05
                             * @patientId    {[string]}
                             * @doctorId    {[string]}
                             * @modify    {[int]}
                             * @return   {[type]}
                             */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data1) {
                              console.log(data1)
                                  // allresult.push(data1)
                            }, function (err) {
                              console.log(err)
                            })
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allresult) {
                          console.log(allresult)
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                        })
                      } else {
                        $scope.consultable = 1
                      }
                    })
                  }
                } else {
                  if ($scope.consultable == 1) {
                    $scope.consultable = 0
                    $ionicPopup.confirm({// 没有免费也没有回答次数 交钱 充值 加次数
                      title: '咨询确认',
                      template: '进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。确认付费咨询？',
                      okText: '确认',
                      cancelText: '取消'
                    }).then(function (res) {
                      if (res) {
                        $scope.consultable = 1
                        ionicLoadingshow()
                        var neworder = {
                          'userId': Storage.get('UID'),
                          'role': 'appPatient',
                          'money': charge1 * 100,
                          // "money":10,
                          'class': '01',
                          'name': '咨询',
                          'notes': DoctorId,
                          'paystatus': 0,
                          'paytime': new Date(),
                          // "ip":result.data.ip,
                          'trade_type': 'APP',
                          'body_description': '咨询服务'
                        }
                        /**
                         * *[后台根据order下订单，生成拉起微信支付所需的参数]
                         * @Author   ZXF
                         * @DateTime 2017-07-05
                         * @param    {[type]}
                         * @param    {[type]}
                         * @param    {[type]}
                         * @param    {[type]}
                         * @param    {[type]}
                         * @param    {[type]}
                         * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                         */
                        Mywechat.addOrder(neworder).then(function (orderdata) {
                          if (orderdata.results.status === 1) {
                            ionicLoadinghide()
                            $q.all([
                              /**
                             * *患者咨询医生 给医生账户‘转账’
                             * @Author   ZXF
                             * @DateTime 2017-07-05
                             * @patientId    {[string]}
                             * @doctorId    {[string]}
                             * @doctorName    {[string]}暂时未使用
                             * @money    {[int]}
                             * @return   {[type]}
                             */
                              Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: charge1}).then(function (data) {
                                console.log(data)
                                return data
                              }, function (err) {
                                console.log(err)
                              }),
                            // plus doc answer count  patientId:doctorId:modify
                            /**
                             * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                             * @Author   ZXF
                             * @DateTime 2017-07-05
                             * @patientId    {[string]}
                             * @doctorId    {[string]}
                             * @modify    {[int]}
                             * @return   {[type]}
                             */
                              Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              })
                            ]).then(function (allres) {
                              $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                            })
                          } else if (orderdata.results.status === 0) {
                            ionicLoadinghide()
                            $ionicLoading.show({
                              template: orderdata.results.msg,
                              duration: 1000
                            })
                            $q.all([
                               /**
                             * *患者咨询医生 给医生账户‘转账’
                             * @Author   ZXF
                             * @DateTime 2017-07-05
                             * @patientId    {[string]}
                             * @doctorId    {[string]}
                             * @doctorName    {[string]}暂时未使用
                             * @money    {[int]}
                             * @return   {[type]}
                             */
                              Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: charge1}).then(function (data) {
                                console.log(data)
                                return data
                              }, function (err) {
                                console.log(err)
                              }),
                            // plus doc answer count  patientId:doctorId:modify
                            /**
                             * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                             * @Author   ZXF
                             * @DateTime 2017-07-05
                             * @patientId    {[string]}
                             * @doctorId    {[string]}
                             * @modify    {[int]}
                             * @return   {[type]}
                             */
                              Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              })
                            ]).then(function (allres) {
                              $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                            })
                          } else {
                            ionicLoadinghide()
                            var params = {
                              'partnerid': '1480817392', // merchant id
                              'prepayid': orderdata.results.prepay_id[0], // prepay id
                              'noncestr': orderdata.results.nonceStr, // nonce
                              'timestamp': orderdata.results.timestamp, // timestamp
                              'sign': orderdata.results.paySign // signed string
                            }
                          // alert(JSON.stringify(params));
                          /**
                           * *[微信jssdk方法，拉起微信支付]
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @partnerid    {[type]}
                           * @prepayid    {[type]}
                           * @noncestr    {[type]}
                           * @timestamp    {[type]}
                           * @sign       {[type]}
                           * @return   {[type]}
                           */
                            Wechat.sendPaymentRequest(params, function () {
                              // alert("Success");
                              $q.all([
                                 /**
                               * *患者咨询医生 给医生账户‘转账’
                               * @Author   ZXF
                               * @DateTime 2017-07-05
                               * @patientId    {[string]}
                               * @doctorId    {[string]}
                               * @doctorName    {[string]}暂时未使用
                               * @money    {[int]}
                               * @return   {[type]}
                               */
                                Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: charge1}).then(function (data) {
                                  console.log(data)
                                  return data
                                }, function (err) {
                                  console.log(err)
                                }),
                                  // plus doc answer count  patientId:doctorId:modify
                                  /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                                Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                                  console.log(data)
                                }, function (err) {
                                  console.log(err)
                                })
                              ]).then(function (allres) {
                                $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                              })
                            }, function (reason) {
                              if (reason == '发送请求失败') {
                                $ionicLoading.show({
                                  template: '请正确安装微信后使用此功能',
                                  duration: 1000
                                })
                              } else {
                                $ionicLoading.show({
                                  template: reason,
                                  duration: 1000
                                })
                              }
                            })
                          }
                        }, function (err) {
                          ionicLoadinghide()
                          console.log(err)
                        })
                      } else {
                        $scope.consultable = 1
                      }
                    })
                  }
                }
              }, function (err) {
                console.log(err)
              })
            }
          }, function (err) {
            console.log(err)
          })
  }
/**
 * *[用户使用问诊按钮]
 * @Author   ZXF
 * @DateTime 2017-07-05
 * @DoctorId    {[type]}
 * @docname    {[type]}
 * @charge1    {[type]}咨询费用
 * @charge2    {[type]}问诊费用
 * @return   {[type]}
 */
  $scope.consult = function (DoctorId, docname, charge1, charge2) {
   /**
   * *[获取用户当前咨询相关的信息，是否正在进行]
   * @Author   ZXF
   * @DateTime 2017-07-05
   * @doctorId    {[string]}用户咨询医生id
   * @patientId    {[string]}
   * @return   {[type]}status==1 有正在进行的咨询或者问诊 直接进咨询界面
   */
    Counsels.getStatus({doctorId: DoctorId, patientId: Storage.get('UID')})
      .then(function (data) {
        // zxf 判断条件重写
        if (data.result != '请填写咨询问卷!' && data.result.status == 1) { // 有尚未完成的咨询或者问诊
          if (data.result.type == 1) { // 咨询转问诊
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的咨询，补齐差价可升级为问诊，问诊中询问医生的次数不限。确认付费升级为问诊？',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  ionicLoadingshow()
                  var neworder = {
                    'userId': Storage.get('UID'),
                    'role': 'appPatient',
                    'money': charge2 * 100 - charge1 * 100,
                    'class': '03',
                    'name': '升级',
                    'notes': DoctorId,
                    'paystatus': 0,
                    'paytime': new Date(),
                    'trade_type': 'APP',
                    'body_description': '咨询升级服务'
                  }
                  /**
                   * *[后台根据order下订单，生成拉起微信支付所需的参数]
                   * @Author   ZXF
                   * @DateTime 2017-07-05
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                   */
                  Mywechat.addOrder(neworder).then(function (orderdata) {
                    if (orderdata.results.status === 1) {
                      ionicLoadinghide()
                      $ionicLoading.show({
                        template: orderdata.results.msg,
                        duration: 1000
                      })
                      /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                      Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                        if (data.result == '修改成功') {
                          // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            var msgJson = {
                              clientType: 'app',
                              contentType: 'custom',
                              fromName: '',
                              fromID: Storage.get('UID'),
                              fromUser: {
                                avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                              },
                              targetID: DoctorId,
                              targetName: '',
                              targetType: 'single',
                              status: 'send_going',
                              createTimeInMillis: Date.now(),
                              newsType: '11',
                              targetRole: 'doctor',
                              content: {
                                type: 'counsel-upgrade'
                              }
                            }
                            socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                            socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                            setTimeout(function () {
                              $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                            }, 500)
                          })
                        }
                      }, function (err) {
                        console.log(err)
                      })
                    } else if (orderdata.results.status === 0) {
                      ionicLoadinghide()
                      $ionicLoading.show({
                        template: orderdata.results.msg,
                        duration: 1000
                      })
                      /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                      Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                        if (data.result == '修改成功') {
                          // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                              // plus doc answer count  patientId:doctorId:modify
                               /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            var msgJson = {
                              clientType: 'app',
                              contentType: 'custom',
                              fromName: '',
                              fromID: Storage.get('UID'),
                              fromUser: {
                                avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                              },
                              targetID: DoctorId,
                              targetName: '',
                              targetType: 'single',
                              status: 'send_going',
                              createTimeInMillis: Date.now(),
                              newsType: '11',
                              targetRole: 'doctor',
                              content: {
                                type: 'counsel-upgrade'
                              }
                            }
                            socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                            socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                            setTimeout(function () {
                              $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                            }, 500)
                          })
                        }
                      }, function (err) {
                        console.log(err)
                      })
                    } else {
                      ionicLoadinghide()
                      var params = {
                        'partnerid': '1480817392', // merchant id
                        'prepayid': orderdata.results.prepay_id[0], // prepay id
                        'noncestr': orderdata.results.nonceStr, // nonce
                        'timestamp': orderdata.results.timestamp, // timestamp
                        'sign': orderdata.results.paySign // signed string
                      }
                      /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                      Wechat.sendPaymentRequest(params, function () {
                        /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                        Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                          if (data.result == '修改成功') {
                            // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                            $q.all([
                              /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                              Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              }),
                              // plus doc answer count  patientId:doctorId:modify
                               /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                              Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              })
                            ]).then(function (allres) {
                              var msgJson = {
                                clientType: 'app',
                                contentType: 'custom',
                                fromName: '',
                                fromID: Storage.get('UID'),
                                fromUser: {
                                  avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                                },
                                targetID: DoctorId,
                                targetName: '',
                                targetType: 'single',
                                status: 'send_going',
                                createTimeInMillis: Date.now(),
                                newsType: '11',
                                targetRole: 'doctor',
                                content: {
                                  type: 'counsel-upgrade'
                                }
                              }
                              socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                              socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                              setTimeout(function () {
                                $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                              }, 500)
                            })
                          }
                        }, function (err) {
                          console.log(err)
                        })
                      }, function (reason) {
                        if (reason == '发送请求失败') {
                          $ionicLoading.show({
                            template: '请正确安装微信后使用此功能',
                            duration: 1000
                          })
                        } else {
                          $ionicLoading.show({
                            template: reason,
                            duration: 1000
                          })
                        }
                      })
                    }
                  }, function (err) {
                    ionicLoadinghide()
                    console.log(err)
                  })
                } else {
                  $scope.consultable = 1
                }
              })
            }
          } else {
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的问诊，点击确认继续上一次问诊！',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  $state.go('tab.consult-chat', {chatId: DoctorId, type: data.result.type, status: 1})
                } else {
                  $scope.consultable = 1
                }
              })
            }
          }
        } else { // 没有进行中的问诊咨询 查看是否已经付过费
          Account.getCounts({patientId: Storage.get('UID'), doctorId: DoctorId}).then(function (data) {
            console.log(data.result.count)
            if (data.result.count == 999) { // 上次有购买问诊 但是没有新建问诊
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '问诊确认',
                  template: '您上次付费的问诊尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else if (data.result.count == 3) { // 已经付费的咨询 但是没有开始
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '问诊确认',
                  template: '您上次付费的咨询尚未新建成功，补齐差价可升级为问诊，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。确认付费升级为问诊？',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    ionicLoadingshow()
                    var neworder = {
                      'userId': Storage.get('UID'),
                      'role': 'appPatient',
                        // "money":$scope.doctor.charge1*100,
                      'money': charge2 * 100 - charge1 * 100,
                      'class': '03',
                      'name': '升级',
                      'notes': DoctorId,
                      'paystatus': 0,
                      'paytime': new Date(),
                        // "ip":result.data.ip,
                      'trade_type': 'APP',
                      'body_description': '咨询升级服务'
                    }
                    /**
                     * *[后台根据order下订单，生成拉起微信支付所需的参数]
                     * @Author   ZXF
                     * @DateTime 2017-07-05
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                     */
                    Mywechat.addOrder(neworder).then(function (orderdata) {
                      // alert(JSON.stringify(orderdata))
                      if (orderdata.results.status === 1) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(DoctorId + Storage.get('UID'))
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                        })
                      } else if (orderdata.results.status === 0) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(DoctorId + Storage.get('UID'))
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                        })
                      } else {
                        ionicLoadinghide()
                        var params = {
                          'partnerid': '1480817392', // merchant id
                          'prepayid': orderdata.results.prepay_id[0], // prepay id
                          'noncestr': orderdata.results.nonceStr, // nonce
                          'timestamp': orderdata.results.timestamp, // timestamp
                          'sign': orderdata.results.paySign // signed string
                        }
                        /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                        Wechat.sendPaymentRequest(params, function () {
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: charge2 - charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                                // plus doc answer count  patientId:doctorId:modify
                                 /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(DoctorId + Storage.get('UID'))
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                                // ionicLoadinghide();
                            $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                          })
                        }, function (reason) {
                          if (reason == '发送请求失败') {
                            $ionicLoading.show({
                              template: '请正确安装微信后使用此功能',
                              duration: 1000
                            })
                          } else {
                            $ionicLoading.show({
                              template: reason,
                              duration: 1000
                            })
                          }
                        })
                      }
                    }, function (err) {
                      ionicLoadinghide()
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else {
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({// 没有免费也没有回答次数 交钱 充值 加次数
                  title: '问诊确认',
                  template: '进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。确认付费问诊？',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    ionicLoadingshow()
                    var neworder = {
                      'userId': Storage.get('UID'),
                      'role': 'appPatient',
                      'money': charge2 * 100,
                      'class': '02',
                      'name': '问诊',
                      'notes': DoctorId,
                      'paystatus': 0,
                      'paytime': new Date(),
                      // "ip":result.data.ip,
                      'trade_type': 'APP',
                      'body_description': '问诊服务'
                    }
                    /**
                     * *[后台根据order下订单，生成拉起微信支付所需的参数]
                     * @Author   ZXF
                     * @DateTime 2017-07-05
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                     */
                    Mywechat.addOrder(neworder).then(function (orderdata) {
                      if (orderdata.results.status === 1) {
                        ionicLoadinghide()
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: charge2}).then(function (data) {
                            console.log(data)
                            // alert(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                        })
                      } else if (orderdata.results.status === 0) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: charge2}).then(function (data) {
                            console.log(data)
                            // alert(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                        })
                      } else {
                        ionicLoadinghide()
                        var params = {
                          'partnerid': '1480817392', // merchant id
                          'prepayid': orderdata.results.prepay_id[0], // prepay id
                          'noncestr': orderdata.results.nonceStr, // nonce
                          'timestamp': orderdata.results.timestamp, // timestamp
                          'sign': orderdata.results.paySign // signed string
                        }
                        /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                        Wechat.sendPaymentRequest(params, function () {
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: charge2}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                          })
                        }, function (reason) {
                          if (reason == '发送请求失败') {
                            $ionicLoading.show({
                              template: '请正确安装微信后使用此功能',
                              duration: 1000
                            })
                          } else {
                            $ionicLoading.show({
                              template: reason,
                              duration: 1000
                            })
                          }
                        })
                      }
                    }, function (err) {
                      ionicLoadinghide()
                      console.log(err)
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            }
          }, function (err) {
            console.log(err)
          })
        }
      }, function (err) {
        console.log(err)
      })
  }
  /**
   * [点击医生卡片，跳转医生详情页面传参（医生的userId）]
   * @Author   PXY
   * @DateTime 2017-07-10
   */
  $scope.getDoctorDetail = function (id) {
    $state.go('tab.DoctorDetail', {DoctorId: id})
  }
}])

.controller('DoctorDetailCtrl', ['$ionicLoading', 'Mywechat', '$http', '$ionicPopup', '$scope', '$state', '$ionicHistory', '$stateParams', 'Doctor', 'Counsels', 'Storage', 'Account', 'CONFIG', 'Expense', 'socket', '$q', 'Patient', function ($ionicLoading, Mywechat, $http, $ionicPopup, $scope, $state, $ionicHistory, $stateParams, Doctor, Counsels, Storage, Account, CONFIG, Expense, socket, $q, Patient) {
  // 返回
  $scope.GoBack = function () {
    // console.log('111');
    // console.log($ionicHistory.backView());
    $ionicHistory.goBack()
  }

  var DoctorId = $stateParams.DoctorId
  console.log(DoctorId)
  // 进入咨询页面之前先判断患者的个人信息是否完善，若否则禁用咨询和问诊，并弹窗提示完善个人信息
  $scope.$on('$ionicView.beforeEnter', function () {
    /**
     * [获取患者个人信息]
     * @Author   PXY
     * @DateTime 2017-07-10
     * @param {userId:String}
     * @return data:{results:Object/String}  注：如果填了个人信息返回的为对象，如果没填则为字符串
     */
    Patient.getPatientDetail({userId: Storage.get('UID')}).then(function (data) {
      console.log(data)
      if (data.results) {
        $scope.DisabledConsult = false
      } else {
        $scope.DisabledConsult = true
        var unComPatPopup = $ionicPopup.show({
          title: '温馨提示',
          template: '您的个人信息并未完善，无法向医生发起咨询或问诊，请先前往 [我的->个人信息] 完善您的个人信息。',
          buttons: [
            {
              text: '取消',
              onTap: function (e) {
                            // e.preventDefault();
              }
            },
            {
              text: '确定',
              type: 'button-calm',
              onTap: function (e) {
                $state.go('userdetail', {last: 'consult'})
              }
            }
          ]
        })
      }
    }, function (err) {
      console.log(err)
      $ionicLoading.show({template: '网络错误！', duration: 1000})
    })
  })

  $scope.doctor = ''
  /**
   * [获取医生的详细信息]
   * @Author   PXY
   * @DateTime 2017-07-12
   * @param    {userId：String}
   * @return   data:{
               *  "results": {
                    "_id": "59008dea0ae89f31383e662d",
                    "name": "徐楠",
                    "workUnit": "杏康门诊部",
                    "department": "肾内科",
                    "title": "主治医师",
                    "province": "浙江省",
                    "city": "杭州市",
                    "job": "专科医生",
                    "userId": "U201612260027",
                    "gender": 2,
                    "score": 8,
                    "photoUrl": "http://wx.qlogo.cn/mmopen/Q3auHgzwzM4KoJ7NTdoDOxBoqvLnnaJwSWhkgyUl2COtpDXib4uhtXZIDC1j4WIdjM1sZxPFCPtyT7kMb2Ag4XQ/0",
                    ...,}
                    }
   */
  Doctor.getDoctorInfo({userId: DoctorId}).then(
      function (data) {
        $scope.doctor = data.results
        console.log($scope.doctor)
      },
      function (err) {
        console.log(err)
      }
    )

  var ionicLoadingshow = function () {
    $ionicLoading.show({
      template: '加载中...'
    })
  }
  var ionicLoadinghide = function () {
    $ionicLoading.hide()
  }
  $scope.consultable = 1
  $scope.question = function (DoctorId, docname) {
    Counsels.getStatus({doctorId: DoctorId, patientId: Storage.get('UID')})
      .then(function (data) {
        // zxf 判断条件重写
        if (data.result != '请填写咨询问卷!' && data.result.status == 1) { // 有尚未完成的咨询或者问诊
          if (data.result.type == 1) {
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您有尚未结束的咨询，点击确认继续上一次咨询！',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  $state.go('tab.consult-chat', {chatId: DoctorId, type: 1, status: 1})
                } else {
                  $scope.consultable = 1
                }
              })
            }
          } else {
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '咨询确认',
                template: '您有尚未结束的问诊，点击确认继续上一次问诊！',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  $state.go('tab.consult-chat', {chatId: DoctorId, type: data.result.type, status: 1})
                } else {
                  $scope.consultable = 1
                }
              })
            }
          }
        } else { // 没有进行中的问诊咨询 查看是否已经付过费
          // console.log("fj;akfmasdfzjl")
          Account.getCounts({patientId: Storage.get('UID'), doctorId: DoctorId}).then(function (data) {
            console.log(data.result.freeTimes)
            if (data.result.count == 999) { // 上次有购买问诊 但是没有新建问诊
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '咨询确认',
                  template: '您上次付费的问诊尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else if (data.result.count == 3) {
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '咨询确认',
                  template: '您上次付费的咨询尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else if (data.result.freeTimes > 0) { // 判断是否已经花过钱了，花过但是还没有新建咨询成功 那么跳转问卷
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '咨询确认',
                  template: '您还有剩余免费咨询次数，进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。点击确认进入免费咨询',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    $q.all([
                      /**
                       * *患者咨询医生 给医生账户‘转账’
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @patientId    {[string]}
                       * @doctorId    {[string]}
                       * @doctorName    {[string]}暂时未使用
                       * @money    {[int]}
                       * @return   {[type]}
                       */
                      Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: 0}).then(function (data) {
                        console.log(data)
                      }, function (err) {
                        console.log(err)
                      }),
                      // 免费咨询次数减一 count+3
                      Account.updateFreeTime({patientId: Storage.get('UID')}).then(function (data) {
                         /**
                         * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                         * @Author   ZXF
                         * @DateTime 2017-07-05
                         * @patientId    {[string]}
                         * @doctorId    {[string]}
                         * @modify    {[int]}
                         * @return   {[type]}
                         */
                        Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                          console.log(data)
                        }, function (err) {
                          console.log(err)
                        })
                      }, function (err) {
                        console.log(err)
                      })
                    ]).then(function (allres) {
                      $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else {
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({// 没有免费也没有回答次数 交钱 充值 加次数
                  title: '咨询确认',
                  template: '进入咨询后，根据您提供的问卷描述，医生会最多作三次回答，之后此次咨询自动结束，请谨慎组织语言，尽可能在咨询问卷以及咨询过程中详细描述病情和需求。确认付费咨询？',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    ionicLoadingshow()
                    var neworder = {
                      'userId': Storage.get('UID'),
                      'role': 'appPatient',
                      // "money":$scope.doctor.charge1*100,
                      'money': $scope.doctor.charge1 * 100,
                      'class': '01',
                      'name': '咨询',
                      'notes': DoctorId,
                      'paystatus': 0,
                      'paytime': new Date(),
                      // "ip":result.data.ip,
                      'trade_type': 'APP',
                      'body_description': '咨询服务'
                    }
                    /**
                     * *[后台根据order下订单，生成拉起微信支付所需的参数]
                     * @Author   ZXF
                     * @DateTime 2017-07-05
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                     */
                    Mywechat.addOrder(neworder).then(function (orderdata) {
                      if (orderdata.results.status === 1) {
                        ionicLoadinghide()
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: $scope.doctor.charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                        // plus doc answer count  patientId:doctorId:modify
                         /**
                           * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @modify    {[int]}
                           * @return   {[type]}
                           */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (alllres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                        })
                      } else if (orderdata.results.status === 0) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: $scope.doctor.charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                        // plus doc answer count  patientId:doctorId:modify
                         /**
                         * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                         * @Author   ZXF
                         * @DateTime 2017-07-05
                         * @patientId    {[string]}
                         * @doctorId    {[string]}
                         * @modify    {[int]}
                         * @return   {[type]}
                         */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (alllres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                        })
                      } else {
                        ionicLoadinghide()
                        var params = {
                          'partnerid': '1480817392', // merchant id
                          'prepayid': orderdata.results.prepay_id[0], // prepay id
                          'noncestr': orderdata.results.nonceStr, // nonce
                          'timestamp': orderdata.results.timestamp, // timestamp
                          'sign': orderdata.results.paySign // signed string
                        }
                        /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                        Wechat.sendPaymentRequest(params, function () {
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '咨询', doctorName: docname, money: $scope.doctor.charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                          // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 3}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (alllres) {
                            $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 1})
                          })
                        }, function (reason) {
                          if (reason == '发送请求失败') {
                            $ionicLoading.show({
                              template: '请正确安装微信后使用此功能',
                              duration: 1000
                            })
                          } else {
                            $ionicLoading.show({
                              template: reason,
                              duration: 1000
                            })
                          }
                        })
                      }
                    }, function (err) {
                      ionicLoadinghide()
                      console.log(err)
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            }
          // }
          }, function (err) {
            console.log(err)
          })
        }
      }, function (err) {
        console.log(err)
      })
  }

  $scope.consult = function (DoctorId, docname) {
    console.log(DoctorId)
    Counsels.getStatus({doctorId: DoctorId, patientId: Storage.get('UID')})
      .then(function (data) {
        // zxf 判断条件重写
        if (data.result != '请填写咨询问卷!' && data.result.status == 1) { // 有尚未完成的咨询或者问诊
          if (data.result.type == 1) { // 咨询转问诊
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的咨询，补齐差价可升级为问诊，问诊中询问医生的次数不限。确认付费升级为问诊？',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  ionicLoadingshow()
                  var neworder = {
                    'userId': Storage.get('UID'),
                    'role': 'appPatient',
                    // "money":$scope.doctor.charge1*100,
                    'money': $scope.doctor.charge2 * 100 - $scope.doctor.charge1 * 100,
                    'class': '03',
                    'name': '升级',
                    'notes': DoctorId,
                    'paystatus': 0,
                    'paytime': new Date(),
                    // "ip":result.data.ip,
                    'trade_type': 'APP',
                    'body_description': '咨询升级服务'
                  }
                  /**
                   * *[后台根据order下订单，生成拉起微信支付所需的参数]
                   * @Author   ZXF
                   * @DateTime 2017-07-05
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @param    {[type]}
                   * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                   */
                  Mywechat.addOrder(neworder).then(function (orderdata) {
                    if (orderdata.results.status === 1) {
                      ionicLoadinghide()
                      $ionicLoading.show({
                        template: orderdata.results.msg,
                        duration: 1000
                      })
                      /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                      Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                        if (data.result == '修改成功') {
                          // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            var msgJson = {
                              clientType: 'app',
                              contentType: 'custom',
                              fromName: '',
                              fromID: Storage.get('UID'),
                              fromUser: {
                                avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                              },
                              targetID: DoctorId,
                              targetName: '',
                              targetType: 'single',
                              status: 'send_going',
                              createTimeInMillis: Date.now(),
                              newsType: '11',
                              targetRole: 'doctor',
                              content: {
                                type: 'counsel-upgrade'
                              }
                            }
                            socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                            socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                            setTimeout(function () {
                              $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                            }, 500)
                          })
                        }
                      }, function (err) {
                        console.log(err)
                      })
                    } else if (orderdata.results.status === 0) {
                      ionicLoadinghide()
                      $ionicLoading.show({
                        template: orderdata.results.msg,
                        duration: 1000
                      })
                      /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                      Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                        if (data.result == '修改成功') {
                          // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            var msgJson = {
                              clientType: 'app',
                              contentType: 'custom',
                              fromName: '',
                              fromID: Storage.get('UID'),
                              fromUser: {
                                avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                              },
                              targetID: DoctorId,
                              targetName: '',
                              targetType: 'single',
                              status: 'send_going',
                              createTimeInMillis: Date.now(),
                              newsType: '11',
                              targetRole: 'doctor',
                              content: {
                                type: 'counsel-upgrade'
                              }
                            }
                            socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                            socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                            setTimeout(function () {
                              $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                            }, 500)
                          })
                        }
                      }, function (err) {
                        console.log(err)
                      })
                    } else {
                      ionicLoadinghide()
                      var params = {
                        'partnerid': '1480817392', // merchant id
                        'prepayid': orderdata.results.prepay_id[0], // prepay id
                        'noncestr': orderdata.results.nonceStr, // nonce
                        'timestamp': orderdata.results.timestamp, // timestamp
                        'sign': orderdata.results.paySign // signed string
                      }
                      /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                      Wechat.sendPaymentRequest(params, function () {
                          // 点击确认 将咨询的type=1 变成type=3
                          /**
                       * *[用户选择将咨询升级成问诊是调用方法，将咨询的type从1（咨询）转为3（问诊）]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @doctorId    {[string]}
                       * @patientId    {[string]}
                       * @type    {[int]}只能是1
                       * @changeType    {[bool]}
                       * @return   {[type]}
                       */
                        Counsels.changeType({doctorId: DoctorId, patientId: Storage.get('UID'), type: 1, changeType: 'true'}).then(function (data) {
                          if (data.result == '修改成功') {
                            // 确认新建咨询之后 给医生账户转积分 其他新建都在最后提交的时候转账 但是升级是在这里完成转账
                            $q.all([
                              /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                              Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              }),
                              // plus doc answer count  patientId:doctorId:modify
                               /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                              Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                                console.log(data)
                              }, function (err) {
                                console.log(err)
                              })
                            ]).then(function (allres) {
                              var msgJson = {
                                clientType: 'app',
                                contentType: 'custom',
                                fromName: '',
                                fromID: Storage.get('UID'),
                                fromUser: {
                                  avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + Storage.get('UID') + '_myAvatar.jpg'
                                },
                                targetID: DoctorId,
                                targetName: '',
                                targetType: 'single',
                                status: 'send_going',
                                createTimeInMillis: Date.now(),
                                newsType: '11',
                                targetRole: 'doctor',
                                content: {
                                  type: 'counsel-upgrade'
                                }
                              }
                              socket.emit('newUser', {user_name: Storage.get('UID'), user_id: Storage.get('UID'), client: 'patient'})
                              socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                              setTimeout(function () {
                                $state.go('tab.consult-chat', {chatId: DoctorId, type: 3, status: 1})
                              }, 500)
                            })
                          }
                        }, function (err) {
                          console.log(err)
                        })
                      }, function (reason) {
                        if (reason == '发送请求失败') {
                          $ionicLoading.show({
                            template: '请正确安装微信后使用此功能',
                            duration: 1000
                          })
                        } else {
                          $ionicLoading.show({
                            template: reason,
                            duration: 1000
                          })
                        }
                      })
                    }
                  }, function (err) {
                    ionicLoadinghide()
                    console.log(err)
                  })
                } else {
                  $scope.consultable = 1
                }
              })
            }
          } else {
            if ($scope.consultable == 1) {
              $scope.consultable = 0
              $ionicPopup.confirm({
                title: '问诊确认',
                template: '您有尚未结束的问诊，点击确认继续上一次问诊！',
                okText: '确认',
                cancelText: '取消'
              }).then(function (res) {
                if (res) {
                  $scope.consultable = 1
                  $state.go('tab.consult-chat', {chatId: DoctorId, type: data.result.type, status: 1})
                } else {
                  $scope.consultable = 1
                }
              })
            }
          }
        } else { // 没有进行中的问诊咨询 查看是否已经付过费
          Account.getCounts({patientId: Storage.get('UID'), doctorId: DoctorId}).then(function (data) {
            console.log(DoctorId)
            if (data.result.count == 999) { // 上次有购买问诊 但是没有新建问诊
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '问诊确认',
                  template: '您上次付费的问诊尚未新建成功，点击确认继续填写完善上次的咨询问卷，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else if (data.result.count == 3) { // 已经付费的咨询 但是没有开始
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({
                  title: '问诊确认',
                  template: '您上次付费的咨询尚未新建成功，补齐差价可升级为问诊，进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。确认付费升级为问诊？',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    ionicLoadingshow()
                    var neworder = {
                      'userId': Storage.get('UID'),
                      'role': 'appPatient',
                      // "money":$scope.doctor.charge1*100,
                      'money': $scope.doctor.charge2 * 100 - $scope.doctor.charge1 * 100,
                      'class': '03',
                      'name': '升级',
                      'notes': DoctorId,
                      'paystatus': 0,
                      'paytime': new Date(),
                      // "ip":result.data.ip,
                      'trade_type': 'APP',
                      'body_description': '咨询升级服务'
                    }
                    /**
                     * *[后台根据order下订单，生成拉起微信支付所需的参数]
                     * @Author   ZXF
                     * @DateTime 2017-07-05
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                     */
                    Mywechat.addOrder(neworder).then(function (orderdata) {
                      if (orderdata.results.status === 1) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(DoctorId + Storage.get('UID'))
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                        })
                      } else if (orderdata.results.status === 0) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(DoctorId + Storage.get('UID'))
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                        })
                      } else {
                        ionicLoadinghide()
                        var params = {
                          'partnerid': '1480817392', // merchant id
                          'prepayid': orderdata.results.prepay_id[0], // prepay id
                          'noncestr': orderdata.results.nonceStr, // nonce
                          'timestamp': orderdata.results.timestamp, // timestamp
                          'sign': orderdata.results.paySign // signed string
                        }
                        /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                        Wechat.sendPaymentRequest(params, function () {
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '升级', doctorName: docname, money: $scope.doctor.charge2 - $scope.doctor.charge1}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(DoctorId + Storage.get('UID'))
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})// 这里的type是2不是3 因为还没有新建成功，
                          })
                        }, function (reason) {
                          if (reason == '发送请求失败') {
                            $ionicLoading.show({
                              template: '请正确安装微信后使用此功能',
                              duration: 1000
                            })
                          } else {
                            $ionicLoading.show({
                              template: reason,
                              duration: 1000
                            })
                          }
                        })
                      }
                    }, function (err) {
                      ionicLoadinghide()
                      console.log(err)
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            } else {
              if ($scope.consultable == 1) {
                $scope.consultable = 0
                $ionicPopup.confirm({// 没有免费也没有回答次数 交钱 充值 加次数
                  title: '问诊确认',
                  template: '进入问诊后，您询问该医生的次数不限，最后由医生结束此次问诊，请尽可能在咨询问卷以及问诊过程中详细描述病情和需求。确认付费问诊？',
                  okText: '确认',
                  cancelText: '取消'
                }).then(function (res) {
                  if (res) {
                    $scope.consultable = 1
                    ionicLoadingshow()
                    var neworder = {
                      'userId': Storage.get('UID'),
                      'role': 'appPatient',
                      // "money":$scope.doctor.charge1*100,
                      'money': $scope.doctor.charge2 * 100,
                      'class': '02',
                      'name': '问诊',
                      'notes': DoctorId,
                      'paystatus': 0,
                      'paytime': new Date(),
                      // "ip":result.data.ip,
                      'trade_type': 'APP',
                      'body_description': '问诊服务'
                    }
                    /**
                     * *[后台根据order下订单，生成拉起微信支付所需的参数]
                     * @Author   ZXF
                     * @DateTime 2017-07-05
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @param    {[type]}
                     * @return   {[type]}results.status===1表示医生设置的费用为0不需要拉起微信支付，status==0表示因活动免费也不进微信，else拉起微信
                     */
                    Mywechat.addOrder(neworder).then(function (orderdata) {
                      if (orderdata.results.status === 1) {
                        ionicLoadinghide()
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: $scope.doctor.charge2}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                        })
                      } else if (orderdata.results.status === 0) {
                        ionicLoadinghide()
                        $ionicLoading.show({
                          template: orderdata.results.msg,
                          duration: 1000
                        })
                        $q.all([
                          /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                          Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: $scope.doctor.charge2}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          }),
                          // plus doc answer count  patientId:doctorId:modify
                           /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                          Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                            console.log(data)
                          }, function (err) {
                            console.log(err)
                          })
                        ]).then(function (allres) {
                          $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                        })
                      } else {
                        ionicLoadinghide()
                        var params = {
                          'partnerid': '1480817392', // merchant id
                          'prepayid': orderdata.results.prepay_id[0], // prepay id
                          'noncestr': orderdata.results.nonceStr, // nonce
                          'timestamp': orderdata.results.timestamp, // timestamp
                          'sign': orderdata.results.paySign // signed string
                        }
                        /**
                       * *[微信jssdk方法，拉起微信支付]
                       * @Author   ZXF
                       * @DateTime 2017-07-05
                       * @partnerid    {[type]}
                       * @prepayid    {[type]}
                       * @noncestr    {[type]}
                       * @timestamp    {[type]}
                       * @sign       {[type]}
                       * @return   {[type]}
                       */
                        Wechat.sendPaymentRequest(params, function () {
                          $q.all([
                            /**
                           * *患者咨询医生 给医生账户‘转账’
                           * @Author   ZXF
                           * @DateTime 2017-07-05
                           * @patientId    {[string]}
                           * @doctorId    {[string]}
                           * @doctorName    {[string]}暂时未使用
                           * @money    {[int]}
                           * @return   {[type]}
                           */
                            Expense.rechargeDoctor({patientId: Storage.get('UID'), doctorId: DoctorId, type: '问诊', doctorName: docname, money: $scope.doctor.charge2}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            }),
                            // plus doc answer count  patientId:doctorId:modify
                             /**
                                 * *[修改患者咨询问诊过程能够询问的次数]count=3表示咨询 count=999表示问诊
                                 * @Author   ZXF
                                 * @DateTime 2017-07-05
                                 * @patientId    {[string]}
                                 * @doctorId    {[string]}
                                 * @modify    {[int]}
                                 * @return   {[type]}
                                 */
                            Account.modifyCounts({patientId: Storage.get('UID'), doctorId: DoctorId, modify: 999}).then(function (data) {
                              console.log(data)
                            }, function (err) {
                              console.log(err)
                            })
                          ]).then(function (allres) {
                            $state.go('tab.consultQuestionnaire', {DoctorId: DoctorId, counselType: 2})
                          })
                        }, function (reason) {
                          if (reason == '发送请求失败') {
                            $ionicLoading.show({
                              template: '请正确安装微信后使用此功能',
                              duration: 1000
                            })
                          } else {
                            $ionicLoading.show({
                              template: reason,
                              duration: 1000
                            })
                          }
                        })
                      }
                    }, function (err) {
                      ionicLoadinghide()
                      console.log(err)
                    })
                  } else {
                    $scope.consultable = 1
                  }
                })
              }
            }
          }, function (err) {
            console.log(err)
          })
        }
      }, function (err) {
        console.log(err)
      })
  }
}])

// 关于--PXY
.controller('aboutCtrl', ['$scope', '$timeout', '$state', 'Storage', '$ionicHistory', function ($scope, $timeout, $state, Storage, $ionicHistory) {
  // 返回
  $scope.Goback = function () {
    // console.log(123);
    $state.go('tab.mine')
    // $ionicHistory.goBack();
  }
}])

// 修改密码--PXY
.controller('changePasswordCtrl', ['$scope', '$timeout', '$state', '$ionicPopup', 'Storage', '$ionicHistory', 'User', function ($scope, $timeout, $state, $ionicPopup, Storage, $ionicHistory, User) {
  // $scope.Goback = function(){
  //   $ionicHistory.goBack();
  // }

  $scope.ishide = true
  $scope.change = {oldPassword: '', newPassword: '', confirmPassword: ''}
  /**
   * [验证旧密码，如果验证通过则显示新密码的输入框]
   * @Author   PXY
   * @DateTime 2017-07-12
   * @param    change:{oldPassword: String, newPassword: String, confirmPassword: String}
   */
  $scope.passwordCheck = function (change) {
    $scope.logStatus1 = ''
    if (change.oldPassword != '') {
      var username = Storage.get('USERNAME')
      // 调用登录方法验证密码是否正确，有点不恰当
      User.logIn({username: username, password: $scope.change.oldPassword, role: 'patient'})
        .then(function (succ) {
          console.log(succ)
          if (succ.mesg == "User password isn't correct!") {
            $scope.logStatus1 = '验证失败，密码错误！'
          } else {
            $scope.ishide = false
          }
        }, function (err) {
          console.log(err)
        })
    } else {
      $scope.logStatus1 = '请输入旧密码！'
    }
  }
  /**
   * [验证新密码两次输入是否一致，如果一致则修改密码，修改成功后弹窗提示并跳转“我的”页面]
   * @Author   PXY
   * @DateTime 2017-07-12
   * @param    change:{oldPassword: String, newPassword: String, confirmPassword: String}
   */
  $scope.gotoChange = function (change) {
    $scope.logStatus2 = ''
    if ((change.newPassword != '') && (change.confirmPassword != '')) {
      if (change.newPassword == change.confirmPassword) {
        if (change.newPassword.length < 6) {
          $scope.logStatus2 = '密码长度太短了！'
        } else {
          /**
           * [修改密码]
           * @Author   PXY
           * @DateTime 2017-07-12
           * @param    {phoneNo：String,password:String}
           * @return   succ:{
                          "results": 0,
                          "mesg": "password reset success!"
                      }
           */
          User.changePassword({phoneNo: Storage.get('USERNAME'), password: change.newPassword}).then(function (succ) {
            console.log(succ)
            if (succ.mesg == 'password reset success!') {
              $ionicPopup.alert({
                title: '修改密码成功！'
              }).then(function (res) {
                $scope.logStatus2 = '修改密码成功！'
                $state.go('tab.mine')
              })
            }
          }, function (err) {
            console.log(err)
          })
        }
      } else {
        $scope.logStatus2 = '两次输入的密码不一致'
      }
    } else {
      $scope.logStatus2 = '请输入两遍新密码'
    }
  }
}])

// 肾病保险主页面--TDY
.controller('insuranceCtrl', ['$scope', '$state', '$ionicHistory', 'insurance', 'Storage', '$filter', '$ionicPopup', function ($scope, $state, $ionicHistory, insurance, Storage, $filter, $ionicPopup) {
  var show = false

  /**
   * [点击后显示菜单]
   * @Author   TongDanyang
   * @DateTime 2017-07-09
   * @return   {Boolean}   [description]
   */
  $scope.isShown = function () {
    return show
  }
  /**
   * [再次点击后收回菜单]
   * @Author   TongDanyang
   * @DateTime 2017-07-09
   * @return   {[type]}    [description]
   */
  $scope.toggle = function () {
    show = !show
  }

  // $scope.intension = function () {
  //   $state.go('intension')
  // }

  /**
   * [跳转至保费计算页面]
   * @Author   TongDanyang
   * @DateTime 2017-07-09
   * @return   {[type]}    [description]
   */
  $scope.expense = function () {
    $state.go('insuranceexpense')
  }
  /**
   * [跳转至肾功能计算页面]
   * @Author   TongDanyang
   * @DateTime 2017-07-09
   * @return   {[type]}    [description]
   */
  $scope.kidneyfunction = function () {
    $state.go('kidneyfunction')
  }

  // $scope.staff = function () {
  //   $state.go('insurancestafflogin')
  // }

  /**
   * [提交保险意向，点击后会将患者ID及点击时间存到后台]
   * @Author   TongDanyang
   * @DateTime 2017-07-09
   * @param    {[object]}  temp [包括患者的ID及点击的时间]
   * @return   {[type]}    [description]
   */
  $scope.submitintension = function () {
    var time = new Date()
    time = $filter('date')(time, 'yyyy-MM-dd HH:mm:ss')
    var temp = {
      'patientId': Storage.get('UID'),
      'status': 1,
      'date': time.substr(0, 10)
    }
    insurance.setPrefer(temp).then(function (data) {
      if (data.results == 'success') {
        $ionicPopup.show({
          title: '已收到您的保险意向，工作人员将尽快与您联系！',
          buttons: [
            {
              text: '確定',
              type: 'button-positive'
            }
          ]
        })
      }
    },
    function (err) {

    })
  }

  // $scope.cancel = function () {
  //   $state.go('insurance')
  // }
}])

// 肾病保险相关工具--TDY
.controller('insurancefunctionCtrl', ['$scope', '$state', '$http', '$ionicPopup', function ($scope, $state, $http, $ionicPopup) {
  /*
  保费计算页面数据初始化
   */
  $scope.InsuranceInfo = {
    'InsuranceAge': 25,
    'Gender': 'NotSelected',
    'InsuranceTime': '5年',
    'CalculationType': 'CalculateMoney',
    'InsuranceMoney': null,
    'InsuranceExpense': 0,
    'InsuranceParameter': 0
  }
  /*
  肾功能计算页面数据初始化
   */
  $scope.Kidneyfunction = {
    'Gender': 'NotSelected',
    'Age': null,
    'CreatinineUnit': 'μmol/L',
    'Creatinine': null,
    'KidneyfunctionValue': 0
  }
  /*
  获取本地保险年龄列表
   */
  $http.get('data/insruanceage1.json').success(function (data) {
    $scope.InsuranceAges = data
  })

  $scope.Genders = [
    {
      'Type': 'NotSelected',
      'Name': '请选择',
      'No': 0
    },
    {
      'Type': 'Male',
      'Name': '男',
      'No': 1
    },
    {
      'Type': 'Female',
      'Name': '女',
      'No': 2
    }
  ]

  $scope.InsuranceTimes = [
    {
      'Time': '5年'
    },
    {
      'Time': '10年'
    }
  ]

  $scope.CalculationTypes = [
    {
      'Type': 'CalculateMoney',
      'Name': '保费算保额',
      'No': 1
    },
    {
      'Type': 'CalculateExpense',
      'Name': '保额算保费',
      'No': 2
    }
  ]

  $scope.CreatinineUnits = [
    {
      'Type': 'mg/dl'
    },
    {
      'Type': 'μmol/L'
    }
  ]
  /*
  获取本地保费计算系数
   */
  $http.get('data/InsuranceParameter.json').success(function (data) {
    dict = data
  })
  /*
  根据患者填写的数据计算保费
   */
  $scope.getexpense = function () {
    if ($scope.InsuranceInfo.Gender == 'NotSelected') {
      alert('请选择性别')
    } else if ($scope.InsuranceInfo.InsuranceMoney == null) {
      alert('请输入金额')
    } else {
      for (var i = 0; i < dict.length; i++) {
        if (dict[i].Age == $scope.InsuranceInfo.InsuranceAge && dict[i].Gender == $scope.InsuranceInfo.Gender && dict[i].Time == $scope.InsuranceInfo.InsuranceTime) {
          $scope.InsuranceInfo.InsuranceParameter = dict[i].Parameter
          break
        }
      }
      if ($scope.InsuranceInfo.CalculationType == 'CalculateExpense') {
        $scope.InsuranceInfo.InsuranceExpense = $scope.InsuranceInfo.InsuranceMoney * $scope.InsuranceInfo.InsuranceParameter / 1000
        // alert("您的保费为：" + $scope.InsuranceInfo.InsuranceExpense.toFixed(2) + "元")
        $ionicPopup.show({
          title: '您的保费为：' + $scope.InsuranceInfo.InsuranceExpense.toFixed(2) + '元',
          buttons: [
            {
              text: '確定',
              type: 'button-positive'
            }
          ]
        })
      } else if ($scope.InsuranceInfo.CalculationType == 'CalculateMoney') {
        $scope.InsuranceInfo.InsuranceExpense = 1000 * $scope.InsuranceInfo.InsuranceMoney / $scope.InsuranceInfo.InsuranceParameter
        // alert("您的保额为：" + $scope.InsuranceInfo.InsuranceExpense.toFixed(2) + "元")
        $ionicPopup.show({
          title: '您的保额为：' + $scope.InsuranceInfo.InsuranceExpense.toFixed(2) + '元',
          buttons: [
            {
              text: '確定',
              type: 'button-positive'
            }
          ]
        })
      }
    }
  }
  /*
  重置保费计算相关数据
   */
  $scope.resetexpense = function () {
    $scope.InsuranceInfo = {
      'InsuranceAge': 25,
      'Gender': 'NotSelected',
      'InsuranceTime': '5年',
      'CalculationType': 'CalculateMoney',
      'InsuranceMoney': null,
      'InsuranceExpense': 0
    }
  }
  /*
  根据保险年限读取不同的年龄列表
   */
  $scope.changeAge = function () {
    if ($scope.InsuranceInfo.InsuranceTime == '5年') {
      $http.get('data/insuranceage1.json').success(function (data) {
        $scope.InsuranceAges = data
      })
    } else {
      $http.get('data/insuranceage2.json').success(function (data) {
        $scope.InsuranceAges = data
      })
    }
  }
  /*
  根据患者填写的数据计算肾功能
   */
  $scope.getkidneyfunction = function () {
    if ($scope.Kidneyfunction.Age == null) {
      alert('请输入年龄')
    }
    if ($scope.Kidneyfunction.Creatinine == null) {
      alert('请输入肌酐')
    }
    if ($scope.Kidneyfunction.CreatinineUnit == 'mg/dl' && $scope.Kidneyfunction.Gender == 'Female') {
      if ($scope.Kidneyfunction.Creatinine <= 0.7) {
        $scope.Kidneyfunction.KidneyfunctionValue = 144 * Math.pow(($scope.Kidneyfunction.Creatinine / 0.7), -0.329) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      } else {
        $scope.Kidneyfunction.KidneyfunctionValue = 144 * Math.pow(($scope.Kidneyfunction.Creatinine / 0.7), -1.209) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      }
    } else if ($scope.Kidneyfunction.CreatinineUnit == 'mg/dl' && $scope.Kidneyfunction.Gender == 'Male') {
      if ($scope.Kidneyfunction.Creatinine <= 0.9) {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine / 0.9), -0.411) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      } else {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine / 0.9), -1.209) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      }
    } else if ($scope.Kidneyfunction.CreatinineUnit == 'μmol/L' && $scope.Kidneyfunction.Gender == 'Female') {
      if ($scope.Kidneyfunction.Creatinine <= 62) {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine * 0.01131 / 0.9), -0.411) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      } else {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine * 0.01131 / 0.9), -1.209) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      }
    } else if ($scope.Kidneyfunction.CreatinineUnit == 'μmol/L' && $scope.Kidneyfunction.Gender == 'Male') {
      if ($scope.Kidneyfunction.Creatinine <= 80) {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine * 0.01131 / 0.9), -0.411) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      } else {
        $scope.Kidneyfunction.KidneyfunctionValue = 141 * Math.pow(($scope.Kidneyfunction.Creatinine * 0.01131 / 0.9), -1.209) * Math.pow(0.993, $scope.Kidneyfunction.Age)
      }
    }
    var kidneyclass = ''
    if ($scope.Kidneyfunction.KidneyfunctionValue >= 90) {
      kidneyclass = '慢性肾病1期'
    } else if ($scope.Kidneyfunction.KidneyfunctionValue < 90 && $scope.Kidneyfunction.KidneyfunctionValue >= 60) {
      kidneyclass = '慢性肾病2期'
    } else if ($scope.Kidneyfunction.KidneyfunctionValue < 60 && $scope.Kidneyfunction.KidneyfunctionValue >= 30) {
      kidneyclass = '慢性肾病3期'
    } else if ($scope.Kidneyfunction.KidneyfunctionValue < 30 && $scope.Kidneyfunction.KidneyfunctionValue >= 15) {
      kidneyclass = '慢性肾病4期'
    } else if ($scope.Kidneyfunction.KidneyfunctionValue < 15) {
      kidneyclass = '慢性肾病5期'
    }
    // alert("估算您的肾小球滤过率为：" + $scope.Kidneyfunction.KidneyfunctionValue.toFixed(2) + ",您处于" +kidneyclass)
    $ionicPopup.show({
      title: '估算您的肾小球滤过率为：' + $scope.Kidneyfunction.KidneyfunctionValue.toFixed(2) + ',您处于' + kidneyclass,
      buttons: [
        {
          text: '確定',
          type: 'button-positive'
        }
      ]
    })
  }
  /*
  重置肾功能计算页面数据
   */
  $scope.resetkidneyfunction = function () {
    $scope.Kidneyfunction = {
      'Gender': 'NotSelected',
      'Age': null,
      'CreatinineUnit': 'μmol/L',
      'Creatinine': null,
      'KidneyfunctionValue': 0
    }
  }
}])

// 肾病保险工作人员--TDY  暂时不用了
.controller('insurancestaffCtrl', ['$scope', '$state', function ($scope, $state) {
  $scope.intensions =
  [
    {
      'name': '李爱国',
      'phoneNo': '15688745215'
    },
    {
      'name': '张爱民',
      'phoneNo': '17866656326'
    },
    {
      'name': '步爱家',
      'phoneNo': '13854616548'
    }
  ]

  $scope.stafflogin = function () {
    $state.go('insurancestaff')
  }

  $scope.Goback = function () {
    $state.go('insurance')
  }

  $scope.Back = function () {
    $state.go('insurancestafflogin')
  }
}])
// 咨询问卷--TDY

.controller('consultquestionCtrl', ['$ionicLoading', 'Task', '$scope', '$ionicPopup', '$ionicModal', '$state', 'Dict', 'Storage', 'Patient', 'VitalSign', '$filter', '$stateParams', '$ionicPopover', 'Camera', 'Counsels', 'CONFIG', 'Health', 'Account', 'socket', function ($ionicLoading, Task, $scope, $ionicPopup, $ionicModal, $state, Dict, Storage, Patient, VitalSign, $filter, $stateParams, $ionicPopover, Camera, Counsels, CONFIG, Health, Account, socket) {
  // 除了submit函数外其他函数均可参考userdetailCtrl和healthinfoCtrl
  $scope.showProgress = false
  $scope.showSurgicalTime = false
  $scope.openPersonal = true
  $scope.openDiag = true
  var patientId = Storage.get('UID')
  var DoctorId = $stateParams.DoctorId
  var counselType = $stateParams.counselType

  $scope.submitable = false

  var BasicInfoInitial = function () {
  // 页面基本信息初始化
    $scope.BasicInfo =
    {
      'userId': patientId,
      'name': null,
      'gender': null,
      'bloodType': null,
      'hypertension': null,
      'class': null,
      'class_info': null,
      'operationTime': null,
      'allergic': null,
      'height': null,
      'weight': null,
      'birthday': null,
      'IDNo': null,
      'lastVisit': {
        'time': null,
        'hospital': null,
        'diagnosis': null
      }
    }
    Patient.getPatientDetail({userId: patientId}).then(
            function (data) {
              if (data.results != null) {
                $scope.BasicInfo = angular.merge($scope.BasicInfo, data.results)
                console.log($scope.BasicInfo)
                thisPatient = data.results
                if ($scope.BasicInfo.gender != null) {
                  $scope.BasicInfo.gender = searchObj($scope.BasicInfo.gender, $scope.Genders)
                }
                if ($scope.BasicInfo.bloodType != null) {
                  $scope.BasicInfo.bloodType = searchObj($scope.BasicInfo.bloodType, $scope.BloodTypes)
                }
                if ($scope.BasicInfo.hypertension != null) {
                  $scope.BasicInfo.hypertension = searchObj($scope.BasicInfo.hypertension, $scope.Hypers)
                }

                VitalSign.getVitalSigns({userId: patientId, type: 'Weight'}).then(
                    function (data) {
                      if (data.results.length) {
                        var n = data.results.length - 1
                        var m = data.results[n].data.length - 1
                        $scope.BasicInfo.weight = data.results[n].data[m] ? data.results[n].data[m].value : ''
                      }
                    },
                    function (err) {
                      console.log(err)
                    })
              } else {
                $scope.openPersonal = false
              }
              initialDict()
                // console.log($scope.BasicInfo)
            },
            function (err) {
              console.log(err)
            }
        )

    $scope.Questionare = {
      'LastDiseaseTime': '',
      'title': '',
      'help': ''
    }
  }

  BasicInfoInitial()
  var localRefresh = function () {
        // 20140421 zxf
    $scope.items = []// HealthInfo.getall();
    var healthinfotimes = []
    if (Storage.get('consulthealthinfo') != '' && Storage.get('consulthealthinfo') != 'undefined' && Storage.get('consulthealthinfo') != null) {
      healthinfotimes = angular.fromJson(Storage.get('consulthealthinfo'))
    }
    for (var i = 0; i < healthinfotimes.length; i++) {
      Health.getHealthDetail({userId: Storage.get('UID'), insertTime: healthinfotimes[i].time}).then(
                function (data) {
                  if (data.results != null) {
                    $scope.items.push(data.results)
                    $scope.items[$scope.items.length - 1].acture = $scope.items[$scope.items.length - 1].insertTime
                  // $scope.items[$scope.items.length-1].time = $scope.items[$scope.items.length-1].time.substr(0,10)
                  // $scope.items.push({'label':data.results.label,'time':data.results.time.substr(0,10),'description':data.results.description,'insertTime':data.results.insertTime})
                  }
                },
                function (err) {
                  console.log(err)
                })
    }
  }
  $scope.$on('$ionicView.beforeEnter', function () {
    localRefresh()// 局部刷新
        // console.log($stateParams);
  })

    // 跳转修改健康信息
  $scope.gotoEditHealth = function (ele, editId) {
    if (ele.target.nodeName == 'I') {
        // console.log(121212)
      var confirmPopup = $ionicPopup.confirm({
        title: '删除提示',
        template: '记录删除后将无法恢复，确认删除？',
        cancelText: '取消',
        okText: '删除'
      })

      confirmPopup.then(function (res) {
        if (res) {
          Health.deleteHealth({userId: patientId, insertTime: editId.acture}).then(
                    function (data) {
                      if (data.results == 0) {
                        for (var i = 0; i < $scope.items.length; i++) {
                          if (editId.acture == $scope.items[i].acture) {
                            $scope.items.splice(i, 1)
                            break
                          }
                        }
                      }

                    // console.log($scope.items)
                    },
                    function (err) {
                      console.log(err)
                    })
                  // 20140421 zxf
          var healthinfotimes = angular.fromJson(Storage.get('consulthealthinfo'))
          for (var i = 0; i < healthinfotimes.length; i++) {
            if (healthinfotimes[i].time == editId.acture) {
              healthinfotimes.splice(i, 1)
              break
            }
          }
          Storage.set('consulthealthinfo', angular.toJson(healthinfotimes))
        }
      })
    } else {
      $state.go('tab.myHealthInfoDetail', {id: editId, caneidt: false})
    }
  }

  // console.log("Attention:"+DoctorId)
  // var patientId = "U201702080016"
  $scope.Genders =
  [
        {Name: '男', Type: 1},
        {Name: '女', Type: 2}
  ]

  $scope.BloodTypes =
  [
        {Name: 'A型', Type: 1},
        {Name: 'B型', Type: 2},
        {Name: 'AB型', Type: 3},
        {Name: 'O型', Type: 4},
        {Name: '不确定', Type: 5}
  ]

  $scope.Hypers =
  [
        {Name: '是', Type: 1},
        {Name: '否', Type: 2}
  ]

  // 从字典中搜索选中的对象。
  var searchObj = function (code, array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i].Type == code || array[i].type == code || array[i].code == code) return array[i]
    };
    return '未填写'
  }

  $scope.Diseases = ''
  $scope.DiseaseDetails = ''
  $scope.timename = ''
  $scope.getDiseaseDetail = function (Disease) {
    if (Disease.typeName == '肾移植') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '手术日期'
    } else if (Disease.typeName == '血透') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '插管日期'
    } else if (Disease.typeName == '腹透') {
      $scope.showProgress = false
      $scope.showSurgicalTime = true
      $scope.timename = '开始日期'
    } else if (Disease.typeName == 'ckd5期未透析') {
      $scope.showProgress = false
      $scope.showSurgicalTime = false
    } else {
      $scope.showProgress = true
      $scope.showSurgicalTime = false
      $scope.DiseaseDetails = Disease.details
    }
  }
  var initialDict = function () {
    Dict.getDiseaseType({category: 'patient_class'}).then(
        function (data) {
          $scope.Diseases = data.results[0].content
          console.log($scope.Diseases)
          $scope.Diseases.push($scope.Diseases[0])
          console.log($scope.Diseases)
          $scope.Diseases.shift()
          console.log($scope.Diseases)
          if ($scope.BasicInfo.class != null) {
            $scope.BasicInfo.class = searchObj($scope.BasicInfo.class, $scope.Diseases)
            if ($scope.BasicInfo.class.typeName == '血透') {
              $scope.showProgress = false
              $scope.showSurgicalTime = true
              $scope.timename = '插管日期'
            } else if ($scope.BasicInfo.class.typeName == '肾移植') {
              $scope.showProgress = false
              $scope.showSurgicalTime = true
              $scope.timename = '手术日期'
            } else if ($scope.BasicInfo.class.typeName == '腹透') {
              $scope.showProgress = false
              $scope.showSurgicalTime = true
              $scope.timename = '开始日期'
            } else if ($scope.BasicInfo.class.typeName == 'ckd5期未透析') {
              $scope.showProgress = false
              $scope.showSurgicalTime = false
            } else {
              $scope.showProgress = true
              $scope.showSurgicalTime = false
              $scope.DiseaseDetails = $scope.BasicInfo.class.details
              $scope.BasicInfo.class_info = searchObj($scope.BasicInfo.class_info[0], $scope.DiseaseDetails)
            }
          }
        // console.log($scope.Diseases)
        },
        function (err) {
          console.log(err)
        })
  }

    // if(Storage.get('consultcacheinfo')!=null&&Storage.get('consultcacheinfo')!=""&&Storage.get('consultcacheinfo')!='undefined'){
    //     $scope.Questionare=angular.fromJson(Storage.get('consultcacheinfo'))
    // }
    // console.log(angular.toJson($scope.Questionare))
    // if (Storage.get('tempquestionare') !== "" && Storage.get('tempquestionare') !== null)
    // {
    //     $scope.Questionare = angular.fromJson(Storage.get('tempquestionare'))
    // }
  // console.log($scope.Questionare)
  // console.log(Storage.get('tempquestionare'))

  // --------datepicker设置----------------
  var monthList = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  var weekDaysList = ['日', '一', '二', '三', '四', '五', '六']

  // --------诊断日期----------------
  var DiagnosisdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject1.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.BasicInfo.lastVisit.time = yyyy + '-' + m + '-' + d
    }
  }

  $scope.datepickerObject1 = {
    titleLabel: '诊断日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    inputDate: new Date(),    // Optional
    mondayFirst: false,    // Optional
    // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      DiagnosisdatePickerCallback(val)
    }
  }
  // --------手术日期----------------
  var OperationdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject2.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.BasicInfo.operationTime = yyyy + '-' + m + '-' + d
    }
  }
  $scope.datepickerObject2 = {
    titleLabel: '手术日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    mondayFirst: false,    // Optional
    // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      OperationdatePickerCallback(val)
    }
  }
  // --------出生日期----------------
  var BirthdatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject3.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.BasicInfo.birthday = yyyy + '-' + m + '-' + d
    }
  }
  $scope.datepickerObject3 = {
    titleLabel: '出生日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    mondayFirst: false,    // Optional
    // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      BirthdatePickerCallback(val)
    }
  }
  // --------首次发病日期----------------
  var FirstDiseaseTimedatePickerCallback = function (val) {
    if (typeof (val) === 'undefined') {
      console.log('No date selected')
    } else {
      $scope.datepickerObject4.inputDate = val
      var dd = val.getDate()
      var mm = val.getMonth() + 1
      var yyyy = val.getFullYear()
      var d = dd < 10 ? ('0' + String(dd)) : String(dd)
      var m = mm < 10 ? ('0' + String(mm)) : String(mm)
      // 日期的存储格式和显示格式不一致
      $scope.BasicInfo.LastDiseaseTime = yyyy + '-' + m + '-' + d
    }
  }

  $scope.datepickerObject4 = {
    titleLabel: '首次发病日期',  // Optional
    todayLabel: '今天',  // Optional
    closeLabel: '取消',  // Optional
    setLabel: '设置',  // Optional
    setButtonType: 'button-assertive',  // Optional
    todayButtonType: 'button-assertive',  // Optional
    closeButtonType: 'button-assertive',  // Optional
    inputDate: new Date(),    // Optional
    mondayFirst: false,    // Optional
    // disabledDates: disabledDates, //Optional
    weekDaysList: weekDaysList,   // Optional
    monthList: monthList, // Optional
    templateType: 'popup', // Optional
    showTodayButton: 'false', // Optional
    modalHeaderColor: 'bar-positive', // Optional
    modalFooterColor: 'bar-positive', // Optional
    from: new Date(1900, 1, 1),   // Optional
    to: new Date(),    // Optional
    callback: function (val) {    // Mandatory
      FirstDiseaseTimedatePickerCallback(val)
    }
  }
  // --------datepicker设置结束----------------

  var MonthInterval = function (usertime) {
    interval = new Date().getTime() - Date.parse(usertime)
    return (Math.floor(interval / (24 * 3600 * 1000 * 30)))
  }

  var distinctTask = function (kidneyType, kidneyTime, kidneyDetail) {
    var sortNo = 1
        // console.log(kidneyType);
        // console.log(kidneyDetail);
        // if(kidneyTime){
        //     kidneyTime = kidneyTime.substr(0,10);
        // }
    if (kidneyDetail) {
      var kidneyDetail = kidneyDetail[0]
    }
    switch (kidneyType) {
      case 'class_1':
                // 肾移植
        if (kidneyTime != undefined && kidneyTime != null && kidneyTime != '') {
          var month = MonthInterval(kidneyTime)
          console.log('month' + month)
          if (month >= 0 && month < 3) {
            sortNo = 1// 0-3月
          } else if (month >= 3 && month < 6) {
            sortNo = 2 // 3-6个月
          } else if (month >= 6 && month < 36) {
            sortNo = 3 // 6个月到3年
          } else if (month >= 36) {
            sortNo = 4// 对应肾移植大于3年
          }
        } else {
          sortNo = 4
        }
        break
      case 'class_2': case 'class_3':// 慢性1-4期
        if (kidneyDetail != undefined && kidneyDetail != null && kidneyDetail != '') {
          if (kidneyDetail == 'stage_5') { // "疾病活跃期"
            sortNo = 5
          } else if (kidneyDetail == 'stage_6') { // "稳定期
            sortNo = 6
          } else if (kidneyDetail == 'stage_7') { // >3年
            sortNo = 7
          }
        } else {
          sortNo = 6
        }
        break

      case 'class_4':// 慢性5期
        sortNo = 8
        break
      case 'class_5':// 血透
        sortNo = 9
        break

      case 'class_6':// 腹透
        if (kidneyTime != undefined && kidneyTime != null && kidneyTime != '') {
          var month = MonthInterval(kidneyTime)
          console.log('month' + month)
          if (month < 6) {
            sortNo = 10
          } else {
            sortNo = 11
          }
        }
        break
    }
    return sortNo
  }
  $scope.submit = function () {
    // 非引用赋值，避免保存时更改了选择输入select的值时对应项显示空白
    var userInfo = $.extend(true, {}, $scope.BasicInfo)
    userInfo.gender = userInfo.gender.Type
    userInfo.bloodType = userInfo.bloodType.Type
    userInfo.hypertension = userInfo.hypertension.Type
    if (userInfo.class.typeName == 'ckd5期未透析') {
      userInfo.class_info = null
    } else if (userInfo.class_info != null) {
      userInfo.class_info = userInfo.class_info.code
    }
    userInfo.class = userInfo.class.type
    Patient.editPatientDetail(userInfo).then(function (data) {
                    // 保存成功
      console.log($scope.BasicInfo)
            // console.log(data.results);
      var patientId = Storage.get('UID')
      var task = distinctTask(data.results.class, data.results.operationTime, data.results.class_info)
      Task.insertTask({userId: patientId, sortNo: task}).then(
                function (data) {

                }, function (err) {
        console.log('err' + err)
      })
            // if($scope.BasicInfo.weight){
            //     var now = new Date() ;
            //     now =  $filter("date")(now, "yyyy-MM-dd HH:mm:ss");
            //     VitalSign.insertVitalSign({patientId:patientId, type: "Weight",code: "Weight_1", date:now.substr(0,10),datatime:now,datavalue:$scope.BasicInfo.weight,unit:"kg"}).then(function(data){
            //     // console.log($scope.BasicInfo.weight);
            //      // $state.go("tab.consultquestion2",{DoctorId:DoctorId,counselType:counselType});
            //     },function(err){
            //         console.log(err);
            //     });
            // }
    }, function (err) {
      console.log(err)
    })

    Storage.set('tempquestionare', angular.toJson($scope.Questionare))
    Storage.set('tempimgrul', angular.toJson($scope.images))
    console.log($scope.Questionare)
    var temp = {
      'patientId': patientId,
      'type': counselType,
      'doctorId': $stateParams.DoctorId,
      'hospital': $scope.BasicInfo.lastVisit.hospital,
      'visitDate': $scope.BasicInfo.lastVisit.time,
      'diagnosis': $scope.BasicInfo.lastVisit.diagnosis,
      'diagnosisPhotoUrl': $scope.images,
      'sickTime': $scope.Questionare.LastDiseaseTime,
      'symptom': $scope.Questionare.title,
      'symptomPhotoUrl': $scope.images,
      'help': $scope.Questionare.help
    }

    Counsels.questionaire(temp).then(
          function (data) {
            console.log(data)
            if (data.result == '新建成功') {
              // 不能重复提交
              $scope.submitable = true

              Storage.rm('tempquestionare')
              Storage.rm('tempimgrul')
              var msgContent = {
                counsel: data.results,
                type: 'card',
                counselId: data.results.counselId,
                patientId: patientId,
                patientName: $scope.BasicInfo.name,
                doctorId: DoctorId,
                fromId: patientId,
                targetId: DoctorId
              }
              var msgJson = {
                clientType: 'patient',
                contentType: 'custom',
                fromName: thisPatient.name,
                fromID: patientId,
                fromUser: {
                  avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + patientId + '_myAvatar.jpg'
                },
                targetID: DoctorId,
                targetName: '',
                targetType: 'single',
                status: 'send_going',
                createTimeInMillis: Date.now(),
                newsType: '11',
                targetRole: 'doctor',
                content: msgContent
              }
              socket.emit('newUser', {user_name: $scope.BasicInfo.name, user_id: patientId, client: 'patient'})
              socket.emit('message', {msg: msgJson, to: DoctorId, role: 'patient'})
                // $scope.$on('im:messageRes',function(event,messageRes){
                    // socket.off('messageRes');
                    // socket.emit('disconnect');
              if (DoctorId == 'U201612291283') {
                var time = new Date()
                var gid = 'G' + $filter('date')(time, 'MMddHmsss')
                        // var msgdata = $state.params.msg;

                var d = {
                  teamId: '10050278',
                  counselId: data.results.counselId,
                  sponsorId: DoctorId,
                  patientId: patientId,
                  consultationId: gid,
                  status: '1'
                }
                msgContent.consultationId = gid
                var msgTeam = {
                  clientType: 'doctor',
                  targetRole: 'doctor',
                  contentType: 'custom',
                  fromID: DoctorId,
                  fromName: '陈江华',
                  fromUser: {
                    avatarPath: CONFIG.mediaUrl + 'uploads/photos/resized' + DoctorId + '_myAvatar.jpg'
                  },
                  targetID: '10050278',
                  teamId: '10050278',
                  targetName: '陈江华主任医师团队',
                  targetType: 'group',
                  status: 'send_going',
                  newsType: '13',
                  createTimeInMillis: Date.now(),
                  content: msgContent
                }
                Communication.newConsultation(d)
                        .then(function (con) {
                          console.log(con)
                            // socket.emit('newUser',{user_name:'陈江华'.name,user_id:DoctorId});
                          socket.emit('message', {msg: msgTeam, to: '10050278', role: 'patient'})
                          setTimeout(function () {
                            $state.go('tab.consult-chat', {chatId: DoctorId})
                          }, 500)
                        }, function (er) {
                          console.error(err)
                        })
              } else {
                setTimeout(function () {
                  $state.go('tab.consult-chat', {chatId: DoctorId})
                }, 500)
              }
                // });
            }
            console.log(data.results)
          },
        function (err) {
          console.log(err)
        })
  }

  // 上传头像的点击事件----------------------------
  $scope.addnewimage = function ($event) {
    // Storage.set('consultcacheinfo',angular.toJson($scope.Questionare))
    $state.go('tab.myHealthInfoDetail', {id: null, caneidt: true})
    // $scope.openPopover($event);
  }
}])

// 论坛
.controller('forumCtrl', ['$interval', 'News', '$scope', '$state', '$sce', '$http', 'Storage', 'Patient', function ($interval, News, $scope, $state, $sce, $http, Storage, Patient) {
  var phoneNum = Storage.get('USERNAME')
    // console.log(phoneNum)

  var userId = Storage.get('UID')

  var GetUnread = function () {
        // console.log(new Date());
    News.getNewsByReadOrNot({userId: Storage.get('UID'), readOrNot: 0, userRole: 'patient'}).then(//
            function (data) {
                // console.log(data);
              if (data.results.length) {
                $scope.HasUnreadMessages = true
                    // console.log($scope.HasUnreadMessages);
              } else {
                $scope.HasUnreadMessages = false
              }
            }, function (err) {
      console.log(err)
    })
  }

  $scope.$on('$ionicView.enter', function () {
    RefreshUnread = $interval(GetUnread, 2000)
  })

  // 用来登录论坛,这个对应的iframe标签是隐藏的
  $scope.navigation_login = $sce.trustAsResourceUrl('http://patientdiscuss.haihonghospitalmanagement.com/member.php?mod=logging&action=login&loginsubmit=yes&loginhash=$loginhash&mobile=2&username=' + userId + '&password=' + userId)
  // 用来指向论坛首页
  $scope.navigation = $sce.trustAsResourceUrl('http://patientdiscuss.haihonghospitalmanagement.com/')
    // Patient.getPatientDetail({userId: Storage.get('UID')})
    // .then(function(data)
    // {
    //   console.log(data)
    //   $scope.navigation_login=$sce.trustAsResourceUrl("http://patientdiscuss.haihonghospitalmanagement.com/member.php?mod=logging&action=login&loginsubmit=yes&loginhash=$loginhash&mobile=2&username="+data.results.name+phoneNum.slice(7)+"&password="+data.results.name+phoneNum.slice(7));
    //   $scope.navigation=$sce.trustAsResourceUrl("http://patientdiscuss.haihonghospitalmanagement.com/");
    // })
    // $scope.$on('$ionicView.enter', function() {
    //     // RefreshUnread = $interval(GetUnread,2000);
    // });

  $scope.$on('$ionicView.leave', function () {
        // console.log('destroy');
    console.log('destroy')
    $interval.cancel(RefreshUnread)
  })
}])

// 写评论
.controller('SetCommentCtrl', ['$stateParams', '$scope', '$ionicHistory', '$ionicLoading', '$state', 'Storage', 'Counsels', 'Comment',
  function ($stateParams, $scope, $ionicHistory, $ionicLoading, $state, Storage, Counsels, Comment) {
    $scope.comment = {score: 5, commentContent: ''}
    $scope.editable = false

      // //  //评论星星初始化
    $scope.ratingsObject = {
      iconOn: 'ion-ios-star',
      iconOff: 'ion-ios-star-outline',
      iconOnColor: '#FFD700', // rgb(200, 200, 100)
      iconOffColor: 'rgb(200, 100, 100)',
      rating: 5,
      minRating: 1,
      readOnly: false,
      callback: function (rating) {
        $scope.ratingsCallback(rating)
      }
    }
      // $stateParams.counselId
       // 获取历史评论
       // console.log($stateParams);
    if ($stateParams.counselId != undefined && $stateParams.counselId != '' && $stateParams.counselId != null) {
        // console.log($stateParams.counselId)
      Comment.getCommentsByC({counselId: $stateParams.counselId}).then(function (data) {
            // console.log('attention');
            // console.log(data);
        if (data.results.length) {
                // //初始化
          $scope.comment.score = data.results[0].totalScore / 2
          $scope.comment.commentContent = data.results[0].content
                 // 评论星星初始化
          $scope.$broadcast('changeratingstar', $scope.comment.score, true)
          $scope.editable = true
        }
      }, function (err) {
        console.log(err)
      })
    }

      // 评论星星点击改变分数
    $scope.ratingsCallback = function (rating) {
      $scope.comment.score = rating
      console.log($scope.comment.score)
    }

      // 上传评论-有效性验证
    $scope.deliverComment = function () {
        // if($scope.comment.commentContent.length <10)
        // {
        //     $ionicLoading.show({
        //       template: '输入字数不足10字',
        //       noBackdrop: false,
        //       duration: 1000,
        //       hideOnStateChange: true
        //     });
        // }

        // else
        // {//20170504 zxf
      Counsels.insertCommentScore({doctorId: $stateParams.doctorId, patientId: $stateParams.patientId, counselId: $stateParams.counselId, totalScore: $scope.comment.score * 2, content: $scope.comment.commentContent})
          // Counsels.insertCommentScore({doctorId:"doc01",patientId:"p01",counselId:"counsel01",totalScore:$scope.comment.score,content:$scope.comment.commentContent})
          .then(function (data) {
            if (data.result == '成功') { // 插入成功
              $ionicLoading.show({
                template: '评价成功',
                noBackdrop: false,
                duration: 1000,
                hideOnStateChange: true
              })
              // 提交結束之後不能繼續修改
              $scope.$broadcast('changeratingstar', $scope.comment.score, true)
              $scope.editable = true
            }
          }, function (err) {
            console.log(err)
          })
          // SetComment();
        // }
    }
      // $scope.Goback=function(){
      //   $ionicHistory.goBack();
      // }
  }])
.controller('paymentCtrl', ['$scope', '$state', '$ionicHistory', 'Storage', function ($scope, $state, $ionicHistory, Storage) {
    // $scope.Goback=function()
    // {
    //     $ionicHistory.goBack();
    // }
  $scope.payFor = Storage.get('payFor')// 1->充咨询次数 2->充问诊
    // $scope.payFor=1
  $scope.money = 50
  $scope.pay = function (m) {
    if ($scope.payFor == 1) {
      if (m % 50) {
        $scope.msg = '无效的金额,'
      }
    } else {
      $scope.money = 250
    }
        // 微信支付
  }
  console.log($scope.payFor)
}])

.controller('adviceCtrl', ['$scope', '$state', '$ionicLoading', 'Advice', 'Storage', '$timeout', function ($scope, $state, $ionicLoading, Advice, Storage, $timeout) {
    // $scope.GoBack = function(){
    //     console.log('123');
    //     $state.go('tab.mine');
    // }
  /**
   * [提交反馈意见，并且点击后禁用按钮]
   * @Author   PXY
   * @DateTime 2017-07-12
   * @param    adv：Object
   */
  $scope.deliverAdvice = function (adv) {
        // console.log(adv);
    $scope.hasDeliver = true
    /**
     * [提交反馈意见]
     * @Author   PXY
     * @DateTime 2017-07-12
     * @param    {userId:String,role:String,content:String}
     * @return   data:{
                      "result": "新建成功",
                      "newResults": {
                          "__v": 0,
                          "userId": "U201705120006",
                          "role": "patient",
                          "time": "2017-07-12T14:54:29.000Z",
                          "content": "内容",
                          "_id": "5965c7a5bd332a1068ea40d9"
                      }
                  }
     */
    Advice.postAdvice({userId: Storage.get('UID'), role: 'patient', content: adv.content}).then(
            function (data) {
                // console.log(data);
              if (data.result == '新建成功') {
                $ionicLoading.show({
                  template: '提交成功',
                  noBackdrop: false,
                  duration: 1000,
                  hideOnStateChange: true
                })
                $timeout(function () { $state.go('tab.mine') }, 900)
              }
            }, function (err) {
      $scope.hasDeliver = false
      $ionicLoading.show({
        template: '提交失败',
        noBackdrop: false,
        duration: 1000,
        hideOnStateChange: true
      })
    })
  }
}])
.controller('devicesCtrl', ['$scope', '$ionicPopup', '$cordovaBarcodeScanner', 'Devicedata', 'Storage', function ($scope, $ionicPopup, $cordovaBarcodeScanner, Devicedata, Storage) {
  console.log('deviceCtrl')
  $scope.deviceList = [{name: 'n1'}]
  var refresh = function () {
    Devicedata.devices({userId: Storage.get('UID')})
        .then(function (data) {
          console.log(data)
          $scope.deviceList = data.results
        }, function (err) {
          console.log(err)
        })
  }
  refresh()
  $scope.deleteDevice = function (index) {
    console.log('delete')
    Devicedata.BPDeviceDeBinding({appId: 'ssgj', sn: $scope.deviceList[index].deviceInfo.sn, imei: $scope.deviceList[index].deviceInfo.imei, userId: Storage.get('UID')})
        .then(function (succ) {
          console.log(succ)
          refresh()
        }, function (err) {
          console.log(err)
        })
  }
  $scope.scanbarcode = function () {
        // console.log(Storage.get("UID"))
    $cordovaBarcodeScanner.scan().then(function (imageData) {
            // alert(imageData.text);
      if (imageData.cancelled) { return }
      $ionicPopup.show({
        title: '确定绑定此设备？',
        cssClass: 'popupWithKeyboard',
        buttons: [{
          text: '确定',
          onTap: function (e) {
            console.log('ok')
            Devicedata.BPDeviceBinding({appId: 'ssgj', twoDimensionalCode: imageData.text, userId: Storage.get('UID')})
                        .then(function (succ) {
                          if (succ.results.requestStatus == 'Success') {
                            $ionicPopup.alert({
                              title: '绑定成功！',
                              template: '在设备列表页面向左滑动设备标签可以解除绑定',
                              okText: '好的'
                            })
                            refresh()
                          } else {
                            var name = succ.results.substr(0, 1) + '*'
                            $ionicPopup.alert({
                              title: '警告',
                              template: '该血压计已被' + name + '绑定，需要原使用者解除绑定后您才能绑定该设备',
                              okText: '好的'
                            })
                          }
                          console.log(succ)
                        }, function (err) {
                          $ionicPopup.alert({
                            title: '绑定失败,未知原因',
                            okText: '好的'
                          })
                          console.log(err)
                        })
          }
        }, {
          text: '取消',
          onTap: function (e) {
            console.log('cancle')
          }
        }]
      })
    }, function (error) {
      console.log('An error happened -> ' + error)
    })
  }
}])

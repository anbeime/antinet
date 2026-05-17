; Antinet 智能知识管家 - Inno Setup 安装脚本
; 编译方法：安装 Inno Setup 6.x 后，右键本文件 → "编译"
; 或命令行：C:\Program Files (x86)\Inno Setup 6\ISCC.exe AntinetSetup.iss

#define MyAppName "Antinet智能知识管家"
#define MyAppVersion "1.0"
#define MyAppPublisher "Antinet Team"
#define MyAppURL "https://github.com/anbeime/antinet"
#define MyAppExeName "AntinetBackend.exe"
#define MyAppAssocName "Antinet Project"
#define MyAppAssocExt ".antinet"
#define MyAppAssocKey StringChange(MyAppAssocName, " ", "") + MyAppAssocExt

[Setup]
; 注意：AppId 建议用 GUID生成工具生成唯一值
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
; 输出目录和文件名
OutputDir=..\..\..\dist\AntinetSetup
OutputBaseFilename=AntinetSetup-{#MyAppVersion}-setup
SetupIconFile=..\..\..\public\favicon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; 管理员权限（用于安装字体到 C:\Windows\Fonts）
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
; Windows 版本要求
MinVersion=10.0
; 安装向导图片（可选）
;WizardImageFile=wizard_image.bmp

; 语言
[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
; 后端 exe
Source: "dist\AntinetBackend.exe"; DestDir: "{app}"; Flags: ignoreversion

; 字体文件（复制到安装目录，README 说明需要双击安装）
Source: "..\..\public\fonts\NotoSansSC-Regular.ttf"; DestDir: "{app}\fonts"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; 开始菜单
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"

; 桌面快捷方式
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

; 快速启动
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: quicklaunchicon

[Run]
; 安装完成后显示 README
Filename: "{app}\README_INSTALL.txt"; Description: "查看安装说明"; Flags: postinstall shellexecute

[Code]
// 检查是否有另一个实例在运行
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Result := True;
  // 可选：检查端口 8000 是否被占用
  // if PortInUse(8000) then
  // begin
  //   if MsgBox('端口 8000 已被占用。是否强制继续安装？', mbError, MB_YESNO) = IDNO then
  //     Result := False;
  // end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // 安装后可以执行额外操作
    // 例如：注册文件关联、启动服务等
  end;
end;
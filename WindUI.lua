--!strict
-- WindUI-inspired single-file Roblox UI library.

local WindUI = {}
WindUI.__index = WindUI
WindUI.Version = "2.0.0"

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui")

local THEMES = {
	Dark = {Background = Color3.fromRGB(15, 17, 23), Surface = Color3.fromRGB(25, 28, 37), Surface2 = Color3.fromRGB(34, 38, 49), Accent = Color3.fromRGB(108, 92, 231), Text = Color3.fromRGB(241, 243, 249), Muted = Color3.fromRGB(158, 164, 180), Stroke = Color3.fromRGB(55, 60, 76), Danger = Color3.fromRGB(235, 87, 87)},
	Light = {Background = Color3.fromRGB(235, 238, 245), Surface = Color3.fromRGB(255, 255, 255), Surface2 = Color3.fromRGB(239, 242, 248), Accent = Color3.fromRGB(91, 76, 219), Text = Color3.fromRGB(28, 31, 40), Muted = Color3.fromRGB(101, 107, 122), Stroke = Color3.fromRGB(207, 212, 224), Danger = Color3.fromRGB(215, 67, 67)},
	Midnight = {Background = Color3.fromRGB(8, 13, 24), Surface = Color3.fromRGB(15, 23, 40), Surface2 = Color3.fromRGB(24, 35, 57), Accent = Color3.fromRGB(48, 164, 255), Text = Color3.fromRGB(232, 243, 255), Muted = Color3.fromRGB(130, 151, 177), Stroke = Color3.fromRGB(38, 55, 82), Danger = Color3.fromRGB(255, 93, 115)},
}
WindUI.Themes = THEMES

local function create(className: string, properties: {[string]: any}?, children: {Instance}?): Instance
	local instance = Instance.new(className)
	for key, value in properties or {} do (instance :: any)[key] = value end
	for _, child in children or {} do child.Parent = instance end
	return instance
end

local function corner(radius: number): UICorner
	return create("UICorner", {CornerRadius = UDim.new(0, radius)}) :: UICorner
end

local function stroke(color: Color3, transparency: number?): UIStroke
	return create("UIStroke", {Color = color, Transparency = transparency or 0, Thickness = 1}) :: UIStroke
end

local function tween(object: Instance, properties: {[string]: any}, duration: number?)
	TweenService:Create(object, TweenInfo.new(duration or 0.18, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), properties):Play()
end

local function safeCall(callback: ((...any) -> ())?, ...: any)
	if not callback then return end
	local ok, err = pcall(callback, ...)
	if not ok then warn("[WindUI] Callback error: " .. tostring(err)) end
end

local function getParent(): Instance
	local env = getfenv and getfenv() or nil
	local optionalGetHui = env and rawget(env, "gethui")
	if type(optionalGetHui) == "function" then
		local ok, result = pcall(optionalGetHui)
		if ok and typeof(result) == "Instance" then return result end
	end
	local player = Players.LocalPlayer
	if player then return player:WaitForChild("PlayerGui") end
	return CoreGui
end

local function textLabel(text: string, size: number, color: Color3): TextLabel
	return create("TextLabel", {BackgroundTransparency = 1, Text = text, TextColor3 = color, TextSize = size, Font = Enum.Font.Gotham, TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = true}) :: TextLabel
end

local function baseControl(parent: Instance, theme: any, height: number): Frame
	local frame = create("Frame", {Name = "WindUIControl", Parent = parent, BackgroundColor3 = theme.Surface2, Size = UDim2.new(1, -2, 0, height), BorderSizePixel = 0}, {corner(8), stroke(theme.Stroke, 0.35)}) :: Frame
	return frame
end

local Window = {}; Window.__index = Window
local Tab = {}; Tab.__index = Tab
local Section = {}; Section.__index = Section

function WindUI.new(options: {[string]: any}?)
	options = options or {}
	local self = setmetatable({}, WindUI)
	self.ThemeName = options.Theme or "Dark"
	self.Theme = THEMES[self.ThemeName] or THEMES.Dark
	self.Flags = {}
	self.Windows = {}
	self.Connections = {}
	self.Controls = {}
	self.Destroyed = false
	self.Gui = create("ScreenGui", {Name = options.Name or "WindUI", ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling, IgnoreGuiInset = true, DisplayOrder = options.DisplayOrder or 50, Parent = options.Parent or getParent()}) :: ScreenGui
	self.ThemeChanged = Instance.new("BindableEvent")
	return self
end

function WindUI:CreateWindow(options: {[string]: any}?)
	options = options or {}
	local theme = self.Theme
	local size = options.Size or UDim2.fromOffset(720, 480)
	local root = create("Frame", {Name = "Window", Parent = self.Gui, Size = size, Position = options.Position or UDim2.fromScale(0.5, 0.5), AnchorPoint = Vector2.new(0.5, 0.5), BackgroundColor3 = theme.Background, BorderSizePixel = 0, ClipsDescendants = true}, {corner(12), stroke(theme.Stroke, 0.1)}) :: Frame
	local scale = create("UIScale", {Parent = root, Scale = 0.96}) :: UIScale
	tween(scale, {Scale = 1}, 0.25)
	local top = create("Frame", {Name = "Topbar", Parent = root, Size = UDim2.new(1, 0, 0, 50), BackgroundColor3 = theme.Surface, BorderSizePixel = 0}) :: Frame
	local title = textLabel(options.Title or "WindUI", 17, theme.Text); title.Parent = top; title.Position = UDim2.fromOffset(18, 7); title.Size = UDim2.new(1, -130, 0, 20); title.Font = Enum.Font.GothamSemibold
	local subtitle = textLabel(options.Subtitle or "", 11, theme.Muted); subtitle.Parent = top; subtitle.Position = UDim2.fromOffset(18, 28); subtitle.Size = UDim2.new(1, -130, 0, 15)
	local function topButton(text: string, x: number, color: Color3): TextButton
		return create("TextButton", {Parent = top, Text = text, TextColor3 = color, TextSize = 17, Font = Enum.Font.GothamMedium, BackgroundTransparency = 1, Position = UDim2.new(1, x, 0, 8), Size = UDim2.fromOffset(34, 34)}) :: TextButton
	end
	local minimize = topButton("—", -78, theme.Muted)
	local close = topButton("×", -40, theme.Danger)
	local sidebar = create("Frame", {Parent = root, Position = UDim2.fromOffset(0, 50), Size = UDim2.new(0, 180, 1, -50), BackgroundColor3 = theme.Surface, BorderSizePixel = 0}) :: Frame
	local search = create("TextBox", {Name = "Search", Parent = sidebar, Position = UDim2.fromOffset(10, 10), Size = UDim2.new(1, -20, 0, 32), BackgroundColor3 = theme.Surface2, BorderSizePixel = 0, PlaceholderText = "Search controls...", PlaceholderColor3 = theme.Muted, Text = "", TextColor3 = theme.Text, TextSize = 12, Font = Enum.Font.Gotham, ClearTextOnFocus = false}, {corner(7), stroke(theme.Stroke, .45), create("UIPadding", {PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10)})}) :: TextBox
	local tabList = create("ScrollingFrame", {Parent = sidebar, Position = UDim2.fromOffset(10, 50), Size = UDim2.new(1, -20, 1, -60), BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 2, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), ScrollingDirection = Enum.ScrollingDirection.Y}) :: ScrollingFrame
	create("UIListLayout", {Parent = tabList, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder})
	local content = create("Frame", {Parent = root, Position = UDim2.fromOffset(180, 50), Size = UDim2.new(1, -180, 1, -50), BackgroundTransparency = 1}) :: Frame
	local window = setmetatable({Library = self, Root = root, Topbar = top, TitleLabel = title, SubtitleLabel = subtitle, SearchBox = search, Sidebar = sidebar, Content = content, Tabs = {}, ActiveTab = nil, Minimized = false, OriginalSize = size}, Window)
	table.insert(self.Windows, window)
	local floating = create("TextButton", {Name = "MobileToggle", Parent = self.Gui, AnchorPoint = Vector2.new(1, 1), Position = UDim2.new(1, -18, 1, -18), Size = UDim2.fromOffset(48, 48), BackgroundColor3 = theme.Accent, Text = "UI", TextColor3 = Color3.new(1,1,1), TextSize = 13, Font = Enum.Font.GothamBold, AutoButtonColor = false, Visible = UserInputService.TouchEnabled}, {corner(24), stroke(theme.Stroke, .15)}) :: TextButton
	window.FloatingButton = floating
	floating.Activated:Connect(function() window:SetVisible(not root.Visible) end)
	search:GetPropertyChangedSignal("Text"):Connect(function() window:SetSearch(search.Text) end)
	local constraint = create("UISizeConstraint", {Parent = root, MinSize = Vector2.new(320, 260), MaxSize = Vector2.new(1100, 750)}) :: UISizeConstraint
	local camera = workspace.CurrentCamera
	local function responsive()
		if not camera then return end
		local viewport = camera.ViewportSize
		constraint.MaxSize = Vector2.new(math.max(320, viewport.X - 24), math.max(260, viewport.Y - 24))
		if viewport.X < 620 then sidebar.Size = UDim2.new(0, 130, 1, -50); content.Position = UDim2.fromOffset(130, 50); content.Size = UDim2.new(1, -130, 1, -50) else sidebar.Size = UDim2.new(0, 180, 1, -50); content.Position = UDim2.fromOffset(180, 50); content.Size = UDim2.new(1, -180, 1, -50) end
	end
	responsive(); if camera then table.insert(self.Connections, camera:GetPropertyChangedSignal("ViewportSize"):Connect(responsive)) end

	local dragging, dragStart, startPosition
	table.insert(self.Connections, top.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then dragging = true; dragStart = input.Position; startPosition = root.Position end
	end))
	table.insert(self.Connections, UserInputService.InputChanged:Connect(function(input)
		if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
			local delta = input.Position - dragStart; root.Position = UDim2.new(startPosition.X.Scale, startPosition.X.Offset + delta.X, startPosition.Y.Scale, startPosition.Y.Offset + delta.Y)
		end
	end))
	table.insert(self.Connections, UserInputService.InputEnded:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then dragging = false end
	end))
	minimize.Activated:Connect(function() window:Minimize() end)
	close.Activated:Connect(function() window:Close() end)
	return window
end

WindUI.Window = WindUI.CreateWindow

function Window:CreateTab(options: any)
	if type(options) == "string" then options = {Title = options} end
	options = options or {}
	local theme = self.Library.Theme
	local button = create("TextButton", {Parent = self.Sidebar:FindFirstChildOfClass("ScrollingFrame"), Size = UDim2.new(1, 0, 0, 38), BackgroundColor3 = theme.Surface2, BackgroundTransparency = 1, Text = (options.Icon and options.Icon .. "  " or "") .. (options.Title or "Tab"), TextColor3 = theme.Muted, Font = Enum.Font.GothamMedium, TextSize = 13, TextXAlignment = Enum.TextXAlignment.Left, AutoButtonColor = false}, {corner(7), create("UIPadding", {PaddingLeft = UDim.new(0, 12)})}) :: TextButton
	local page = create("ScrollingFrame", {Parent = self.Content, Position = UDim2.fromOffset(14, 14), Size = UDim2.new(1, -28, 1, -28), Visible = false, BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 3, ScrollBarImageColor3 = theme.Accent, AutomaticCanvasSize = Enum.AutomaticSize.Y, CanvasSize = UDim2.new(), ScrollingDirection = Enum.ScrollingDirection.Y}) :: ScrollingFrame
	create("UIListLayout", {Parent = page, Padding = UDim.new(0, 10), SortOrder = Enum.SortOrder.LayoutOrder})
	local tab = setmetatable({Window = self, Button = button, Page = page, Sections = {}}, Tab)
	table.insert(self.Tabs, tab)
	button.Activated:Connect(function() self:SelectTab(tab) end)
	if not self.ActiveTab then self:SelectTab(tab) end
	return tab
end
Window.Tab = Window.CreateTab

function Window:SelectTab(tab)
	local theme = self.Library.Theme
	for _, other in self.Tabs do
		other.Page.Visible = other == tab
		tween(other.Button, {BackgroundTransparency = other == tab and 0 or 1, TextColor3 = other == tab and theme.Text or theme.Muted})
	end
	self.ActiveTab = tab
	if self.SearchBox and self.SearchBox.Text ~= "" then self:SetSearch(self.SearchBox.Text) end
end

function Window:Minimize(value: boolean?)
	if value == nil then value = not self.Minimized end
	self.Minimized = value
	tween(self.Root, {Size = value and UDim2.new(self.OriginalSize.X.Scale, self.OriginalSize.X.Offset, 0, 50) or self.OriginalSize}, 0.25)
end
function Window:Close() tween(self.Root, {Size = UDim2.fromOffset(0, 0)}, 0.2); task.delay(0.21, function() self:Destroy() end) end
function Window:SetVisible(value: boolean) self.Root.Visible = value end
function Window:GetVisible(): boolean return self.Root.Visible end
function Window:SetTitle(value: string) self.TitleLabel.Text = value end
function Window:SetSubtitle(value: string) self.SubtitleLabel.Text = value end
function Window:SetSearch(query: string)
	query=string.lower(query)
	if not self.ActiveTab then return end
	for _,section in self.ActiveTab.Sections do
		local sectionVisible=false
		for _,control in section.Body:GetChildren() do
			if control:IsA("GuiObject") then
				local searchable=""
				for _,item in control:GetDescendants() do if item:IsA("TextLabel") or item:IsA("TextButton") or item:IsA("TextBox") then searchable..=" "..item.Text end end
				if control:IsA("TextButton") then searchable..=" "..control.Text end
				control.Visible=query=="" or string.find(string.lower(searchable),query,1,true)~=nil
				sectionVisible=sectionVisible or control.Visible
			end
		end
		section.Holder.Visible=query=="" or sectionVisible
	end
end
function Window:Destroy() if self.FloatingButton then self.FloatingButton:Destroy() end; if self.Root then self.Root:Destroy() end end

function Tab:CreateSection(title: string?)
	local theme = self.Window.Library.Theme
	local holder = create("Frame", {Parent = self.Page, BackgroundTransparency = 1, Size = UDim2.new(1, -4, 0, 0), AutomaticSize = Enum.AutomaticSize.Y}) :: Frame
	local heading = textLabel(title or "Section", 12, theme.Muted); heading.Parent = holder; heading.Size = UDim2.new(1, 0, 0, 22); heading.Font = Enum.Font.GothamSemibold
	local body = create("Frame", {Parent = holder, Position = UDim2.fromOffset(0, 26), Size = UDim2.new(1, 0, 0, 0), AutomaticSize = Enum.AutomaticSize.Y, BackgroundTransparency = 1}) :: Frame
	create("UIListLayout", {Parent = body, Padding = UDim.new(0, 7), SortOrder = Enum.SortOrder.LayoutOrder})
	create("UIPadding", {Parent = holder, PaddingBottom = UDim.new(0, 8)})
	local section = setmetatable({Tab = self, Library = self.Window.Library, Holder = holder, Body = body}, Section)
	table.insert(self.Sections, section)
	return section
end
Tab.Section = Tab.CreateSection

function Section:_flag(options, default)
	options = options or {}
	local flag = options.Flag
	if flag and self.Library.Flags[flag] == nil then self.Library.Flags[flag] = options.Default ~= nil and options.Default or default end
	if flag then return flag, self.Library.Flags[flag] end
	return nil, options.Default ~= nil and options.Default or default
end
function Section:_register(flag, object)
	if flag then self.Library.Controls[flag] = object end
	return object
end
function Section:Label(options: any)
	if type(options)=="string" then options={Title=options} end; options=options or {}
	local label=textLabel(options.Title or "Label",12,self.Library.Theme.Muted); label.Name="WindUIControl"; label.Parent=self.Body; label.Size=UDim2.new(1,-4,0,24)
	local object={}; function object:Set(value) label.Text=tostring(value) end; function object:SetVisible(value) label.Visible=value end; function object:Destroy() label:Destroy() end; return object
end
function Section:Divider(options: any)
	local title=type(options)=="table" and options.Title or options; local holder=create("Frame",{Name="WindUIControl",Parent=self.Body,Size=UDim2.new(1,-2,0,title and 24 or 10),BackgroundTransparency=1}) :: Frame
	create("Frame",{Parent=holder,AnchorPoint=Vector2.new(0,.5),Position=UDim2.fromScale(0,.5),Size=UDim2.new(1,0,0,1),BackgroundColor3=self.Library.Theme.Stroke,BorderSizePixel=0})
	if title then local caption=textLabel(tostring(title),11,self.Library.Theme.Muted); caption.Parent=holder; caption.AnchorPoint=Vector2.new(.5,.5); caption.Position=UDim2.fromScale(.5,.5); caption.Size=UDim2.fromOffset(math.max(70,#tostring(title)*7),20); caption.BackgroundTransparency=0; caption.BackgroundColor3=self.Library.Theme.Background; caption.TextXAlignment=Enum.TextXAlignment.Center end
	return {Destroy=function() holder:Destroy() end}
end
function Section:Paragraph(options: any)
	if type(options) == "string" then options = {Title = options} end; options=options or {}
	local theme = self.Library.Theme; local frame = baseControl(self.Body, theme, 58)
	local title = textLabel(options.Title or "Paragraph", 14, theme.Text); title.Parent = frame; title.Position = UDim2.fromOffset(14, 9); title.Size = UDim2.new(1, -28, 0, 18); title.Font = Enum.Font.GothamSemibold
	local desc = textLabel(options.Content or options.Description or "", 12, theme.Muted); desc.Parent = frame; desc.Position = UDim2.fromOffset(14, 29); desc.Size = UDim2.new(1, -28, 0, 19)
	local object = {}; function object:Set(content) desc.Text = tostring(content) end; return object
end
function Section:Button(options: any)
	if type(options) == "string" then options = {Title = options} end; options=options or {}
	local theme = self.Library.Theme; local button = create("TextButton", {Parent = self.Body, Size = UDim2.new(1, -2, 0, 42), BackgroundColor3 = theme.Surface2, BorderSizePixel = 0, Text = options.Title or "Button", TextColor3 = theme.Text, TextSize = 13, Font = Enum.Font.GothamMedium, AutoButtonColor = false}, {corner(8), stroke(theme.Stroke, .35)}) :: TextButton
	button.MouseEnter:Connect(function() tween(button, {BackgroundColor3 = self.Library.Theme.Accent}) end); button.MouseLeave:Connect(function() tween(button, {BackgroundColor3 = self.Library.Theme.Surface2}) end)
	button.Activated:Connect(function() safeCall(options.Callback) end)
	return {Fire = function() safeCall(options.Callback) end}
end
function Section:Toggle(options)
	options=options or {}; local theme = self.Library.Theme; local flag, value = self:_flag(options, false); local frame = baseControl(self.Body, theme, 44)
	local label = textLabel(options.Title or "Toggle", 13, theme.Text); label.Parent = frame; label.Position = UDim2.fromOffset(14, 0); label.Size = UDim2.new(1, -70, 1, 0)
	local track = create("TextButton", {Parent = frame, Position = UDim2.new(1, -52, .5, -11), Size = UDim2.fromOffset(38, 22), BackgroundColor3 = value and theme.Accent or theme.Stroke, Text = "", AutoButtonColor = false}, {corner(11)}) :: TextButton
	local dot = create("Frame", {Parent = track, Size = UDim2.fromOffset(16, 16), Position = value and UDim2.fromOffset(19, 3) or UDim2.fromOffset(3, 3), BackgroundColor3 = Color3.new(1,1,1), BorderSizePixel = 0}, {corner(8)}) :: Frame
	local object = {Value = value}
	function object:Set(nextValue, silent) self.Value = not not nextValue; if flag then self.Library.Flags[flag] = self.Value end; local currentTheme=self.Library.Theme; tween(track, {BackgroundColor3 = self.Value and currentTheme.Accent or currentTheme.Stroke}); tween(dot, {Position = self.Value and UDim2.fromOffset(19,3) or UDim2.fromOffset(3,3)}); if not silent then safeCall(options.Callback, self.Value) end end
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	object.Library = self.Library; track.Activated:Connect(function() object:Set(not object.Value) end); return self:_register(flag, object)
end
function Section:Slider(options)
	options=options or {}; local theme = self.Library.Theme; local min, max = options.Min or 0, options.Max or 100; assert(max > min, "[WindUI] Slider Max must be greater than Min"); local flag, value = self:_flag(options, min); value = math.clamp(value, min, max)
	local frame = baseControl(self.Body, theme, 58); local label = textLabel(options.Title or "Slider", 13, theme.Text); label.Parent = frame; label.Position = UDim2.fromOffset(14, 5); label.Size = UDim2.new(1,-70,0,24)
	local amount = textLabel(tostring(value), 12, theme.Muted); amount.Parent = frame; amount.TextXAlignment = Enum.TextXAlignment.Right; amount.Position = UDim2.new(1,-64,0,5); amount.Size = UDim2.fromOffset(50,24)
	local bar = create("TextButton", {Parent = frame, Position = UDim2.fromOffset(14,38), Size = UDim2.new(1,-28,0,6), BackgroundColor3 = theme.Stroke, Text = "", AutoButtonColor = false}, {corner(3)}) :: TextButton
	local fill = create("Frame", {Parent = bar, Size = UDim2.fromScale((value-min)/(max-min),1), BackgroundColor3 = theme.Accent, BorderSizePixel = 0}, {corner(3)}) :: Frame
	local object = {Value=value}; object.Library=self.Library
	function object:Set(v, silent) local increment=options.Increment or 1; assert(increment > 0, "[WindUI] Slider Increment must be greater than zero"); v=min+math.floor((math.clamp(v,min,max)-min)/increment+.5)*increment; v=math.clamp(v,min,max); self.Value=v; if flag then self.Library.Flags[flag]=v end; amount.Text=tostring(v); tween(fill,{Size=UDim2.fromScale((v-min)/(max-min),1)}); if not silent then safeCall(options.Callback,v) end end
	local sliding=false; local function update(input) object:Set(min+(max-min)*math.clamp((input.Position.X-bar.AbsolutePosition.X)/bar.AbsoluteSize.X,0,1)) end
	bar.InputBegan:Connect(function(i) if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then sliding=true; update(i) end end)
	table.insert(self.Library.Connections, UserInputService.InputChanged:Connect(function(i) if sliding and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then update(i) end end))
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	table.insert(self.Library.Connections, UserInputService.InputEnded:Connect(function(i) if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then sliding=false end end)); return self:_register(flag, object)
end
function Section:Dropdown(options)
	options=options or {}; local theme=self.Library.Theme; local values=options.Values or {}; local multi=options.Multi==true; local default=options.Default or (multi and {} or values[1]); local flag,value=self:_flag(options,default); local frame=baseControl(self.Body,theme,44); frame.ClipsDescendants=true
	local button=create("TextButton",{Parent=frame,Size=UDim2.new(1,0,0,44),BackgroundTransparency=1,Text="",TextColor3=theme.Text,TextSize=13,Font=Enum.Font.GothamMedium}) :: TextButton
	local list=create("Frame",{Parent=frame,Position=UDim2.fromOffset(8,44),Size=UDim2.new(1,-16,0,#values*33),BackgroundTransparency=1}) :: Frame; create("UIListLayout",{Parent=list,Padding=UDim.new(0,3)})
	local object={Value=value,Open=false}; object.Library=self.Library
	local function has(v) if type(object.Value)~="table" then return false end; for _,x in object.Value do if x==v then return true end end; return false end
	local function label() if multi then local selected={}; if type(object.Value)=="table" then for _,v in object.Value do table.insert(selected,tostring(v)) end end; return #selected>0 and table.concat(selected,", ") or "Select" end; return tostring(object.Value or "Select") end
	function object:Set(v,silent)
		if multi then
			local nextValue={}
			if type(v)=="table" then
				for _,x in v do table.insert(nextValue,x) end
			elseif has(v) then
				if type(self.Value)=="table" then for _,x in self.Value do if x~=v then table.insert(nextValue,x) end end end
			else
				if type(self.Value)=="table" then for _,x in self.Value do table.insert(nextValue,x) end end
				table.insert(nextValue,v)
			end
			self.Value=nextValue
		else
			self.Value=v; self.Open=false; tween(frame,{Size=UDim2.new(1,-2,0,44)})
		end
		if flag then self.Library.Flags[flag]=self.Value end; button.Text=(options.Title or "Dropdown").."   ·   "..label(); if not silent then safeCall(options.Callback,self.Value) end
	end
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	function object:Refresh(nextValues) for _,child in list:GetChildren() do if child:IsA("TextButton") then child:Destroy() end end; values=nextValues or values; for _,v in values do local item=create("TextButton",{Parent=list,Size=UDim2.new(1,0,0,30),BackgroundColor3=self.Library.Theme.Surface,Text=tostring(v),TextColor3=self.Library.Theme.Muted,TextSize=12,Font=Enum.Font.Gotham},{corner(6)}) :: TextButton; item.Activated:Connect(function() object:Set(v) end) end; list.Size=UDim2.new(1,-16,0,#values*33) end
	object:Refresh(values); button.Text=(options.Title or "Dropdown").."   ·   "..label()
	button.Activated:Connect(function() object.Open=not object.Open; local h=object.Open and 52+#values*33 or 44; tween(frame,{Size=UDim2.new(1,-2,0,h)}) end); return self:_register(flag, object)
end
function Section:Input(options)
	options=options or {}; local theme=self.Library.Theme; local flag,value=self:_flag(options,""); local frame=baseControl(self.Body,theme,48); local box=create("TextBox",{Parent=frame,Position=UDim2.fromOffset(12,7),Size=UDim2.new(1,-24,0,34),BackgroundTransparency=1,Text=tostring(value),PlaceholderText=options.Placeholder or options.Title or "Enter text...",PlaceholderColor3=theme.Muted,TextColor3=theme.Text,TextSize=13,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left,ClearTextOnFocus=false}) :: TextBox
	local object={Value=value}; object.Library=self.Library; function object:Set(v,silent) self.Value=tostring(v); box.Text=self.Value; if flag then self.Library.Flags[flag]=self.Value end; if not silent then safeCall(options.Callback,self.Value) end end
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	box.FocusLost:Connect(function(enter) object:Set(box.Text); if enter then safeCall(options.OnEnter,box.Text) end end); return self:_register(flag, object)
end
function Section:ColorPicker(options)
	options=options or {}; local theme=self.Library.Theme; local flag,value=self:_flag(options,options.Default or Color3.fromRGB(255,255,255)); local frame=baseControl(self.Body,theme,86)
	local label=textLabel(options.Title or "Color",13,theme.Text); label.Parent=frame; label.Position=UDim2.fromOffset(14,4); label.Size=UDim2.new(1,-70,0,24)
	local preview=create("Frame",{Parent=frame,Position=UDim2.new(1,-48,0,10),Size=UDim2.fromOffset(30,20),BackgroundColor3=value,BorderSizePixel=0},{corner(5),stroke(theme.Stroke,.2)}) :: Frame
	local object={Value=value}; object.Library=self.Library
	local function channel(name,y,current)
		local bar=create("TextButton",{Parent=frame,Position=UDim2.fromOffset(14,y),Size=UDim2.new(1,-28,0,8),BackgroundColor3=theme.Stroke,Text="",AutoButtonColor=false},{corner(4)}) :: TextButton
		local fill=create("Frame",{Parent=bar,Size=UDim2.fromScale(current,1),BackgroundColor3=theme.Accent,BorderSizePixel=0},{corner(4)}) :: Frame
		return bar,fill
	end
	local rBar,rFill=channel("R",36,value.R); local gBar,gFill=channel("G",52,value.G); local bBar,bFill=channel("B",68,value.B)
	function object:Set(color,silent) self.Value=color; preview.BackgroundColor3=color; rFill.Size=UDim2.fromScale(color.R,1); gFill.Size=UDim2.fromScale(color.G,1); bFill.Size=UDim2.fromScale(color.B,1); if flag then self.Library.Flags[flag]=color end; if not silent then safeCall(options.Callback,color) end end
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	local function bind(bar,channelName) bar.InputBegan:Connect(function(input) if input.UserInputType==Enum.UserInputType.MouseButton1 or input.UserInputType==Enum.UserInputType.Touch then local alpha=math.clamp((input.Position.X-bar.AbsolutePosition.X)/bar.AbsoluteSize.X,0,1); local c=object.Value; object:Set(Color3.new(channelName=="R" and alpha or c.R, channelName=="G" and alpha or c.G, channelName=="B" and alpha or c.B)) end end) end
	bind(rBar,"R"); bind(gBar,"G"); bind(bBar,"B"); return self:_register(flag, object)
end
function Section:Keybind(options)
	options=options or {}; local theme=self.Library.Theme; local flag,value=self:_flag(options,options.Default or Enum.KeyCode.Unknown); local frame=baseControl(self.Body,theme,44); local label=textLabel(options.Title or "Keybind",13,theme.Text); label.Parent=frame; label.Position=UDim2.fromOffset(14,0); label.Size=UDim2.new(1,-100,1,0)
	local button=create("TextButton",{Parent=frame,Position=UDim2.new(1,-92,0,7),Size=UDim2.fromOffset(78,30),BackgroundColor3=theme.Surface,Text=value.Name,TextColor3=theme.Muted,TextSize=11,Font=Enum.Font.Gotham},{corner(6)}) :: TextButton
	local object={Value=value,Listening=false}; object.Library=self.Library; function object:Set(v,silent) self.Value=v; button.Text=v.Name; if flag then self.Library.Flags[flag]=v end; if not silent then safeCall(options.Changed,v) end end
	function object:Get() return self.Value end; function object:SetVisible(v) frame.Visible=v end; function object:Destroy() frame:Destroy() end
	button.Activated:Connect(function() object.Listening=true; button.Text="Press key" end); table.insert(self.Library.Connections, UserInputService.InputBegan:Connect(function(input,processed) if object.Listening then object.Listening=false; object:Set(input.KeyCode); return end; if not processed and input.KeyCode==object.Value then safeCall(options.Callback) end end)); return self:_register(flag, object)
end

function WindUI:GetFlag(name: string) return self.Flags[name] end
function WindUI:SetFlag(name: string, value: any) self.Flags[name] = value end
local function cloneValue(value)
	if typeof(value)=="Color3" then return value end
	if type(value)~="table" then return value end
	local copy={}; for key,item in value do copy[key]=cloneValue(item) end; return copy
end
function WindUI:GetState() local copy={}; for key,value in self.Flags do copy[key]=cloneValue(value) end; return copy end
function WindUI:ExportConfig() return self:GetState() end
function WindUI:ImportConfig(config: {[string]: any}) for key,value in config do self.Flags[key]=cloneValue(value); local control=self.Controls[key]; if control and control.Set then control:Set(value,true) end end; return self:GetState() end
function WindUI:RegisterTheme(name: string, palette: {[string]: Color3})
	assert(type(name)=="string" and name~="", "[WindUI] Theme name required")
	local fallback=THEMES.Dark; local theme={}; for role,color in fallback do theme[role]=palette[role] or color end; THEMES[name]=theme; return theme
end
function WindUI:SetTheme(name: string)
	if not THEMES[name] then warn("[WindUI] Unknown theme: "..tostring(name)); return false end
	local oldTheme=self.Theme; self.ThemeName=name; self.Theme=THEMES[name]
	local colorMap={}; for role,color in oldTheme do colorMap[color]=self.Theme[role] end
	for _,descendant in self.Gui:GetDescendants() do
		if descendant:IsA("GuiObject") then
			local background=colorMap[descendant.BackgroundColor3]; if background then descendant.BackgroundColor3=background end
		end
		if descendant:IsA("TextLabel") or descendant:IsA("TextButton") or descendant:IsA("TextBox") then
			local text=colorMap[descendant.TextColor3]; if text then descendant.TextColor3=text end
			if descendant:IsA("TextBox") then local placeholder=colorMap[descendant.PlaceholderColor3]; if placeholder then descendant.PlaceholderColor3=placeholder end end
		end
		if descendant:IsA("ScrollingFrame") then local scroll=colorMap[descendant.ScrollBarImageColor3]; if scroll then descendant.ScrollBarImageColor3=scroll end end
		if descendant:IsA("UIStroke") then local outline=colorMap[descendant.Color]; if outline then descendant.Color=outline end end
	end
	self.ThemeChanged:Fire(name,self.Theme)
	return true
end
function WindUI:Notify(options: any)
	if type(options)=="string" then options={Title=options} end; options=options or {}; local theme=self.Theme
	local holder=self.Gui:FindFirstChild("Notifications") :: Frame
	if not holder then holder=create("Frame",{Name="Notifications",Parent=self.Gui,AnchorPoint=Vector2.new(1,1),Position=UDim2.new(1,-18,1,-18),Size=UDim2.fromOffset(320,500),BackgroundTransparency=1}) :: Frame; create("UIListLayout",{Parent=holder,VerticalAlignment=Enum.VerticalAlignment.Bottom,Padding=UDim.new(0,8),SortOrder=Enum.SortOrder.LayoutOrder}) end
	local card=create("Frame",{Parent=holder,Size=UDim2.new(1,0,0,70),BackgroundColor3=theme.Surface,BorderSizePixel=0},{corner(9),stroke(theme.Stroke,.2)}) :: Frame
	local title=textLabel(options.Title or "Notification",14,theme.Text); title.Parent=card; title.Position=UDim2.fromOffset(14,10); title.Size=UDim2.new(1,-28,0,20); title.Font=Enum.Font.GothamSemibold
	local content=textLabel(options.Content or options.Description or "",12,theme.Muted); content.Parent=card; content.Position=UDim2.fromOffset(14,32); content.Size=UDim2.new(1,-28,0,25)
	card.Position=UDim2.fromOffset(340,0); tween(card,{Position=UDim2.new()},.25); task.delay(options.Duration or 4,function() if card.Parent then tween(card,{BackgroundTransparency=1,Position=UDim2.fromOffset(340,0)},.2); task.delay(.21,function() if card then card:Destroy() end end) end end)
	return card
end
WindUI.Notification=WindUI.Notify
function WindUI:Confirm(options: any)
	options=options or {}; local theme=self.Theme
	local overlay=create("TextButton",{Parent=self.Gui,Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.new(),BackgroundTransparency=.35,Text="",AutoButtonColor=false,ZIndex=100}) :: TextButton
	local card=create("Frame",{Parent=overlay,AnchorPoint=Vector2.new(.5,.5),Position=UDim2.fromScale(.5,.5),Size=UDim2.fromOffset(360,180),BackgroundColor3=theme.Surface,BorderSizePixel=0,ZIndex=101},{corner(12),stroke(theme.Stroke,.15)}) :: Frame
	local title=textLabel(options.Title or "Are you sure?",17,theme.Text); title.Parent=card; title.Position=UDim2.fromOffset(18,18); title.Size=UDim2.new(1,-36,0,24); title.Font=Enum.Font.GothamSemibold; title.ZIndex=102
	local content=textLabel(options.Content or options.Description or "Confirm this action.",12,theme.Muted); content.Parent=card; content.Position=UDim2.fromOffset(18,48); content.Size=UDim2.new(1,-36,0,58); content.ZIndex=102
	local cancel=create("TextButton",{Parent=card,Position=UDim2.new(.5,4,1,-52),Size=UDim2.new(.5,-22,0,34),BackgroundColor3=theme.Surface2,Text=options.CancelText or "Cancel",TextColor3=theme.Text,TextSize=12,Font=Enum.Font.GothamMedium,ZIndex=102},{corner(7)}) :: TextButton
	local confirm=create("TextButton",{Parent=card,Position=UDim2.new(0,18,1,-52),Size=UDim2.new(.5,-22,0,34),BackgroundColor3=theme.Accent,Text=options.ConfirmText or "Confirm",TextColor3=Color3.new(1,1,1),TextSize=12,Font=Enum.Font.GothamMedium,ZIndex=102},{corner(7)}) :: TextButton
	local function finish(value) safeCall(options.Callback,value); overlay:Destroy() end
	cancel.Activated:Connect(function() finish(false) end); confirm.Activated:Connect(function() finish(true) end); return {Close=function() if overlay.Parent then overlay:Destroy() end end}
end
function WindUI:Destroy()
	if self.Destroyed then return end; self.Destroyed=true
	for _,connection in self.Connections do connection:Disconnect() end; table.clear(self.Connections)
	if self.ThemeChanged then self.ThemeChanged:Destroy() end; if self.Gui then self.Gui:Destroy() end; table.clear(self.Windows); table.clear(self.Flags); table.clear(self.Controls)
end
WindUI.Create=WindUI.new
--!strict
-- Place WindUI.lua beside this LocalScript as a ModuleScript named "WindUI".

local UI = WindUI.new({Name = "WindUIExample", Theme = "Dark"})
local Window = UI:CreateWindow({
	Title = "WindUI Example",
	Subtitle = "Polished Roblox interface",
	Size = UDim2.fromOffset(740, 500),
})

local Main = Window:CreateTab({Title = "Main"})
local General = Main:CreateSection("General")

General:Label("COMPONENT SHOWCASE")
General:Divider("Essentials")
General:Paragraph({
	Title = "Welcome",
	Content = "All callbacks are protected, and controls can persist values through flags.",
})

General:Button({
	Title = "Show notification",
	Callback = function()
		UI:Notify({Title = "WindUI", Content = "The button callback ran successfully.", Duration = 3})
	end,
})

General:Toggle({
	Title = "Enabled",
	Flag = "Enabled",
	Default = true,
	Callback = function(value)
		print("Enabled:", value)
	end,
})

General:Slider({
	Title = "Volume",
	Flag = "Volume",
	Min = 0,
	Max = 100,
	Increment = 5,
	Default = 50,
	Callback = function(value)
		print("Volume:", value)
	end,
})

General:Dropdown({
	Title = "Quality",
	Flag = "Quality",
	Values = {"Low", "Medium", "High"},
	Default = "High",
	Callback = function(value)
		print("Quality:", value)
	end,
})

General:Dropdown({
	Title = "Multi select",
	Flag = "Modes",
	Multi = true,
	Values = {"Fast", "Safe", "Visual", "Debug"},
	Default = {"Fast"},
	Callback = function(values)
		print("Modes:", table.concat(values, ", "))
	end,
})

General:ColorPicker({
	Title = "Accent preview",
	Flag = "AccentColor",
	Default = Color3.fromRGB(108, 92, 231),
	Callback = function(color)
		print("Color:", color)
	end,
})

local Personal = Main:CreateSection("Personalization")
Personal:Input({
	Title = "Display name",
	Placeholder = "Enter a name...",
	Flag = "DisplayName",
	Callback = function(value)
		print("Name:", value)
	end,
})

Personal:Keybind({
	Title = "Toggle window",
	Flag = "WindowKey",
	Default = Enum.KeyCode.RightShift,
	Callback = function()
		Window:SetVisible(not Window.Root.Visible)
	end,
	Changed = function(key)
		print("New key:", key.Name)
	end,
})

local Settings = Window:CreateTab({Title = "Settings"})
local Appearance = Settings:CreateSection("Appearance")
Appearance:Dropdown({
	Title = "Theme",
	Values = {"Dark", "Light", "Midnight"},
	Default = "Dark",
	Callback = function(theme)
		UI:SetTheme(theme)
		UI:Notify({Title = "Theme changed", Content = "Switched to " .. theme .. "."})
	end,
})

Appearance:Button({
	Title = "Print current state",
	Callback = function()
		for flag, value in UI:GetState() do
			print(flag, value)
		end
	end,
})

Appearance:Button({
	Title = "Open confirmation dialog",
	Callback = function()
		UI:Confirm({Title = "Apply settings?", Content = "This demonstrates the modal dialog.", Callback = function(confirmed)
			UI:Notify({Title = confirmed and "Confirmed" or "Cancelled", Content = "Dialog result received."})
		end})
	end,
})

UI:RegisterTheme("Ocean", {
	Background = Color3.fromRGB(7, 22, 33),
	Surface = Color3.fromRGB(11, 35, 50),
	Surface2 = Color3.fromRGB(17, 48, 66),
	Accent = Color3.fromRGB(35, 190, 210),
})

local savedConfig = UI:ExportConfig()
UI:ImportConfig(savedConfig)
UI:Notify({Title = "Ready", Content = "WindUI 2 loaded. Search controls or press RightShift to toggle."})


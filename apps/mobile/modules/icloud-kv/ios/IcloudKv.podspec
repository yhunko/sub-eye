Pod::Spec.new do |s|
  s.name           = 'IcloudKv'
  s.version        = '1.0.0'
  s.summary        = 'NSUbiquitousKeyValueStore access for the SubEye store'
  s.description    = 'A local Expo module: read, write and observe the app''s iCloud key-value store.'
  s.author         = ''
  s.homepage       = 'https://subeye.cc'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end

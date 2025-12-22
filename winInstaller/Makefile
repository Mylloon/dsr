CC = dotnet

TARGET = win-x64

all:

publish:
	@$(CC) publish -c Release -r $(TARGET) --self-contained true /p:PublishSingleFile=true /p:IncludeNativeLibrariesForSelfExtract=true

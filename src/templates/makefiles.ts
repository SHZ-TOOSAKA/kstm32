export const f10x = "\
# Generated by KSTM32\n\
TARGET = {kstm32:target}\n\
BUILD_DIR = build\n\
C_SOURCES = {kstm32:csources}\n\
ASM_SOURCES = {kstm32:asmsources}\n\
DEBUG = 1\n\
PREFIX = {kstm32:prefix}\n\
{kstm32:gccpath}ifdef GCC_PATH\n\
CC = $(GCC_PATH)/$(PREFIX)gcc\n\
AS = $(GCC_PATH)/$(PREFIX)gcc -x assembler-with-cpp\n\
CP = $(GCC_PATH)/$(PREFIX)objcopy\n\
SZ = $(GCC_PATH)/$(PREFIX)size\n\
else\n\
CC = $(PREFIX)gcc\n\
AS = $(PREFIX)gcc -x assembler-with-cpp\n\
CP = $(PREFIX)objcopy\n\
SZ = $(PREFIX)size\n\
endif\n\
HEX = $(CP) -O ihex\n\
BIN = $(CP) -O binary -S\n\
CPU = -mcpu=cortex-m3\n\
MCU = $(CPU) -mthumb $(FPU) $(FLOAT-ABI)\n\
AS_DEFS = \n\
C_DEFS = {kstm32:cdefs}\n\
AS_INCLUDES = \n\
C_INCLUDES = {kstm32:cincludes}\n\
ASFLAGS = $(MCU) $(AS_DEFS) $(AS_INCLUDES) $(OPT) -Wall -fdata-sections -ffunction-sections\n\
CFLAGS = $(MCU) $(C_DEFS) $(C_INCLUDES) $(OPT) -Wall -fdata-sections -ffunction-sections\n\
ifeq ($(DEBUG), 1)\n\
CFLAGS += -g -gdwarf-2\n\
endif\n\
CFLAGS += -MMD -MP -MF\"$(@:%.o=%.d)\"\n\
LDSCRIPT = ldscript.ld\n\
LIBS = -lc -lm -lnosys \n\
LIBDIR = \n\
LDFLAGS = $(MCU) -T$(LDSCRIPT) $(LIBDIR) $(LIBS) -Wl,-Map=$(BUILD_DIR)/$(TARGET).map,--cref -Wl,--gc-sections\n\
all: $(BUILD_DIR)/$(TARGET).elf $(BUILD_DIR)/$(TARGET).hex $(BUILD_DIR)/$(TARGET).bin\n\
OBJECTS = $(addprefix $(BUILD_DIR)/,$(notdir $(C_SOURCES:.c=.o)))\n\
vpath %.c $(sort $(dir $(C_SOURCES)))\n\
OBJECTS += $(addprefix $(BUILD_DIR)/,$(notdir $(ASM_SOURCES:.s=.o)))\n\
vpath %.s $(sort $(dir $(ASM_SOURCES)))\n\
$(BUILD_DIR)/%.o: %.c Makefile | $(BUILD_DIR) \n\
	$(CC) -c $(CFLAGS) -Wa,-a,-ad,-alms=$(BUILD_DIR)/$(notdir $(<:.c=.lst)) $< -o $@\n\
$(BUILD_DIR)/%.o: %.s Makefile | $(BUILD_DIR)\n\
	$(AS) -c $(CFLAGS) $< -o $@\n\
$(BUILD_DIR)/$(TARGET).elf: $(OBJECTS) Makefile\n\
	$(CC) $(OBJECTS) $(LDFLAGS) -o $@\n\
	$(SZ) $@\n\
$(BUILD_DIR)/%.hex: $(BUILD_DIR)/%.elf | $(BUILD_DIR)\n\
	$(HEX) $< $@\n\
$(BUILD_DIR)/%.bin: $(BUILD_DIR)/%.elf | $(BUILD_DIR)\n\
	$(BIN) $< $@	\n\
$(BUILD_DIR):\n\
	mkdir $@\n\
clean:\n\
	-rm -rf $(BUILD_DIR)\n\
-include $(wildcard $(BUILD_DIR)/*.d)";

const f4xx = "";
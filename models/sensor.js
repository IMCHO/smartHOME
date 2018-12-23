module.exports=(sequelize,DataTypes)=>(
    sequelize.define('sensor',{             // sensor 데이터베이스 정의
        temperature:{                       // 온도 컬럼
            type:DataTypes.INTEGER,         // 데이터 타입은 Integer
        },
        humidity:{                          // 습도 컬럼
            type:DataTypes.INTEGER,         // 데이터 타입은 Integer   
        },
        effectiveHumi:{                     // 실효습도 컬럼
            type:DataTypes.INTEGER,         // 데이터 타입은 Integer
        },        
    },{
        timestamps:true,
        paranoid:true,
    })
);